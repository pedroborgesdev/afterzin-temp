package stripe

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"afterzin/api/internal/config"
	"afterzin/api/internal/middleware"
	"afterzin/api/internal/qrcode"
	"afterzin/api/internal/repository"

	"github.com/google/uuid"
)

// Handler provides HTTP handlers for Stripe REST endpoints.
// These complement the GraphQL API with Stripe-specific operations
// that are naturally REST (webhooks, redirects, etc.).
type Handler struct {
	client *Client
	db     *sql.DB
	cfg    *config.Config
}

// NewHandler creates a new Stripe HTTP handler.
func NewHandler(client *Client, db *sql.DB, cfg *config.Config) *Handler {
	return &Handler{client: client, db: db, cfg: cfg}
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// ---------- Connect: Account Management ----------

// CreateAccount handles POST /api/stripe/connect/create-account
// Creates a Stripe Connect Express account for the authenticated producer.
func (h *Handler) CreateAccount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := middleware.UserID(r.Context())
	if userID == "" {
		respondError(w, http.StatusUnauthorized, "não autenticado")
		return
	}

	// Get or create producer profile
	prodID, _ := repository.ProducerIDByUser(h.db, userID)
	if prodID == "" {
		var err error
		prodID, err = repository.CreateProducer(h.db, userID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "erro ao criar perfil de produtor")
			return
		}
	}

	// Check if already has a Stripe account
	existing, _ := repository.GetProducerStripeAccountID(h.db, prodID)
	if existing != "" {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"accountId": existing,
			"message":   "conta Stripe já existe",
		})
		return
	}

	// Get user info for the Stripe account
	user, _ := repository.UserByID(h.db, userID)
	if user == nil {
		respondError(w, http.StatusInternalServerError, "usuário não encontrado")
		return
	}

	// Create Stripe Connected Account (V2 API)
	accountID, err := h.client.CreateConnectedAccount(user.Name, user.Email)
	if err != nil {
		log.Printf("stripe: create account error: %v", err)
		respondError(w, http.StatusInternalServerError, "erro ao criar conta Stripe: "+err.Error())
		return
	}

	// Persist stripe_account_id
	if err := repository.SetProducerStripeAccountID(h.db, prodID, accountID); err != nil {
		log.Printf("stripe: save account id error: %v", err)
		respondError(w, http.StatusInternalServerError, "erro ao salvar conta")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"accountId": accountID,
		"message":   "conta criada com sucesso",
	})
}

// CreateOnboardingLink handles POST /api/stripe/connect/onboarding-link
// Returns a Stripe-hosted URL where the producer completes their onboarding.
func (h *Handler) CreateOnboardingLink(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := middleware.UserID(r.Context())
	if userID == "" {
		respondError(w, http.StatusUnauthorized, "não autenticado")
		return
	}

	prodID, _ := repository.ProducerIDByUser(h.db, userID)
	if prodID == "" {
		respondError(w, http.StatusBadRequest, "perfil de produtor não encontrado")
		return
	}

	accountID, _ := repository.GetProducerStripeAccountID(h.db, prodID)
	if accountID == "" {
		respondError(w, http.StatusBadRequest, "conta Stripe não encontrada — crie primeiro")
		return
	}

	refreshURL := h.client.BaseURL + "/produtor?stripe_refresh=true"
	returnURL := h.client.BaseURL + "/produtor?stripe_onboarding=complete"

	linkURL, err := h.client.CreateAccountLink(accountID, refreshURL, returnURL)
	if err != nil {
		log.Printf("stripe: create account link error: %v", err)
		respondError(w, http.StatusInternalServerError, "erro ao criar link de onboarding: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"url": linkURL,
	})
}

// GetStatus handles GET /api/stripe/connect/status
// Returns the current onboarding and transfer status of the producer's Stripe account.
func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := middleware.UserID(r.Context())
	if userID == "" {
		respondError(w, http.StatusUnauthorized, "não autenticado")
		return
	}

	prodID, _ := repository.ProducerIDByUser(h.db, userID)
	if prodID == "" {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"hasAccount":         false,
			"onboardingComplete": false,
		})
		return
	}

	accountID, _ := repository.GetProducerStripeAccountID(h.db, prodID)
	if accountID == "" {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"hasAccount":         false,
			"onboardingComplete": false,
		})
		return
	}

	// Check live status from Stripe
	status, err := h.client.GetAccountStatus(accountID)
	if err != nil {
		log.Printf("stripe: get account status error: %v", err)
		// Return cached local status
		onboardingComplete, _ := repository.GetProducerOnboardingComplete(h.db, prodID)
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"hasAccount":         true,
			"accountId":          accountID,
			"onboardingComplete": onboardingComplete,
			"error":              "não foi possível verificar status com Stripe",
		})
		return
	}

	// Update local cache
	if status.OnboardingComplete {
		repository.SetProducerOnboardingComplete(h.db, prodID, true)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"hasAccount":         true,
		"accountId":          accountID,
		"onboardingComplete": status.OnboardingComplete,
		"transfersActive":    status.TransfersActive,
		"detailsSubmitted":   status.DetailsSubmitted,
		"payoutsEnabled":     status.PayoutsEnabled,
	})
}

// ---------- Connect: PIX Key ----------

// UpdatePixKey handles POST /api/stripe/connect/pix-key
// Updates the producer's PIX key. Requires ALL events to be paused first.
func (h *Handler) UpdatePixKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := middleware.UserID(r.Context())
	if userID == "" {
		respondError(w, http.StatusUnauthorized, "não autenticado")
		return
	}

	prodID, _ := repository.ProducerIDByUser(h.db, userID)
	if prodID == "" {
		respondError(w, http.StatusBadRequest, "perfil de produtor não encontrado")
		return
	}

	var req struct {
		PixKey     string `json:"pixKey"`
		PixKeyType string `json:"pixKeyType"` // cpf, cnpj, email, phone, random
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "corpo inválido")
		return
	}

	if req.PixKey == "" || req.PixKeyType == "" {
		respondError(w, http.StatusBadRequest, "pixKey e pixKeyType são obrigatórios")
		return
	}

	// Business rule: PIX key can only be changed if ALL events are paused/draft
	allPaused, err := repository.AllProducerEventsPaused(h.db, prodID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "erro ao verificar eventos")
		return
	}
	if !allPaused {
		respondError(w, http.StatusBadRequest, "todos os eventos devem estar pausados para alterar a chave PIX")
		return
	}

	if err := repository.SetProducerPixKey(h.db, prodID, req.PixKey, req.PixKeyType); err != nil {
		respondError(w, http.StatusInternalServerError, "erro ao salvar chave PIX")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "chave PIX atualizada"})
}

// ---------- Payment: PIX PaymentIntent ----------

// CreatePayment handles POST /api/stripe/payment/create
// Creates a Stripe PaymentIntent with PIX for an existing order.
// Returns QR code + copia-e-cola for the customer to pay.
func (h *Handler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := middleware.UserID(r.Context())
	if userID == "" {
		respondError(w, http.StatusUnauthorized, "não autenticado")
		return
	}

	var req struct {
		OrderID string `json:"orderId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "corpo inválido")
		return
	}
	if req.OrderID == "" {
		respondError(w, http.StatusBadRequest, "orderId é obrigatório")
		return
	}

	// Verify order ownership and status
	orderUserID, status, _, err := repository.OrderByID(h.db, req.OrderID)
	if err != nil || orderUserID == "" {
		respondError(w, http.StatusNotFound, "pedido não encontrado")
		return
	}
	if orderUserID != userID {
		respondError(w, http.StatusForbidden, "pedido não pertence ao usuário")
		return
	}
	if status != "PENDING" {
		respondError(w, http.StatusBadRequest, "pedido já processado")
		return
	}

	// Check if order already has a payment intent (avoid duplicate charges)
	existingPI, _ := repository.GetOrderStripePaymentIntentID(h.db, req.OrderID)
	if existingPI != "" {
		// Return existing PI status
		piStatus, err := h.client.GetPaymentIntentStatus(existingPI)
		if err == nil && piStatus.Status != "canceled" {
			respondJSON(w, http.StatusOK, piStatus)
			return
		}
		// If cancelled or errored, allow creating a new one
	}

	// Get order items
	items, err := repository.OrderItemsByOrderID(h.db, req.OrderID)
	if err != nil || len(items) == 0 {
		respondError(w, http.StatusBadRequest, "pedido sem itens")
		return
	}

	// Calculate total amount and resolve connected account
	var connectedAccountID string
	var totalCentavos int64
	var totalTickets int
	var eventTitle string

	for _, item := range items {
		totalTickets += item.Quantity

		tt, _ := repository.TicketTypeByID(h.db, item.TicketTypeID)
		if tt == nil {
			respondError(w, http.StatusBadRequest, "tipo de ingresso não encontrado")
			return
		}
		totalCentavos += int64(tt.Price*100) * int64(item.Quantity)

		// Resolve event → producer → stripe account
		ed, _ := repository.EventDateByID(h.db, item.EventDateID)
		if ed == nil {
			respondError(w, http.StatusBadRequest, "data do evento não encontrada")
			return
		}
		ev, _ := repository.EventByID(h.db, ed.EventID)
		if ev == nil {
			respondError(w, http.StatusBadRequest, "evento não encontrado")
			return
		}
		if eventTitle == "" {
			eventTitle = ev.Title
		}

		if connectedAccountID == "" {
			acctID, _ := repository.GetProducerStripeAccountID(h.db, ev.ProducerID)
			if acctID == "" {
				respondError(w, http.StatusBadRequest, "produtor não configurou recebimento de pagamentos")
				return
			}
			connectedAccountID = acctID
		}
	}

	// Create PIX PaymentIntent via Stripe V1
	pixResult, err := h.client.CreatePixPaymentIntent(PixPaymentParams{
		OrderID:            req.OrderID,
		ConnectedAccountID: connectedAccountID,
		AmountCentavos:     totalCentavos,
		TotalTickets:       totalTickets,
		Description:        fmt.Sprintf("Afterzin - %s", eventTitle),
	})
	if err != nil {
		log.Printf("stripe: create pix payment intent error: %v", err)
		respondError(w, http.StatusInternalServerError, "erro ao criar pagamento PIX: "+err.Error())
		return
	}

	// Persist payment intent on order
	repository.SetOrderStripePaymentIntentID(h.db, req.OrderID, pixResult.PaymentIntentID)

	log.Printf("stripe: PIX payment created for order %s (pi: %s, amount: %d, fee: %d×%d)",
		req.OrderID, pixResult.PaymentIntentID, totalCentavos,
		h.client.ApplicationFee, totalTickets)

	respondJSON(w, http.StatusOK, pixResult)
}

// GetPaymentStatus handles GET /api/stripe/payment/status?orderId=xxx
// Frontend polls this to check if PIX was paid.
func (h *Handler) GetPaymentStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := middleware.UserID(r.Context())
	if userID == "" {
		respondError(w, http.StatusUnauthorized, "não autenticado")
		return
	}

	orderID := r.URL.Query().Get("orderId")
	if orderID == "" {
		respondError(w, http.StatusBadRequest, "orderId é obrigatório")
		return
	}

	// Verify order ownership
	orderUserID, orderStatus, _, err := repository.OrderByID(h.db, orderID)
	if err != nil || orderUserID == "" {
		respondError(w, http.StatusNotFound, "pedido não encontrado")
		return
	}
	if orderUserID != userID {
		respondError(w, http.StatusForbidden, "pedido não pertence ao usuário")
		return
	}

	// If order is already confirmed, return immediately
	if orderStatus == "CONFIRMED" || orderStatus == "PAID" {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"status":      "succeeded",
			"orderStatus": orderStatus,
			"paid":        true,
		})
		return
	}

	// Get PI from order and check Stripe
	piID, _ := repository.GetOrderStripePaymentIntentID(h.db, orderID)
	if piID == "" {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"status": "no_payment",
			"paid":   false,
		})
		return
	}

	piStatus, err := h.client.GetPaymentIntentStatus(piID)
	if err != nil {
		log.Printf("stripe: get PI status error: %v", err)
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"status": "unknown",
			"paid":   false,
			"error":  "não foi possível verificar status",
		})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"status":          piStatus.Status,
		"paymentIntentId": piStatus.PaymentIntentID,
		"paid":            piStatus.Status == "succeeded",
	})
}

// ---------- Webhooks ----------

// HandleWebhook handles POST /api/stripe/webhook
// Verifies signature, deduplicates, and processes Stripe events.
//
// Handled events:
//   - payment_intent.succeeded → PRIMARY: confirms order, creates tickets, generates QR codes
//   - checkout.session.completed → ignored (legacy, kept for compat)
func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 65536))
	if err != nil {
		respondError(w, http.StatusBadRequest, "erro ao ler corpo")
		return
	}

	sigHeader := r.Header.Get("Stripe-Signature")
	if sigHeader == "" {
		respondError(w, http.StatusBadRequest, "assinatura ausente")
		return
	}

	event, err := h.client.VerifyWebhookSignature(body, sigHeader)
	if err != nil {
		log.Printf("stripe: webhook signature error: %v", err)
		respondError(w, http.StatusBadRequest, "assinatura inválida")
		return
	}

	// Idempotency check
	if repository.WebhookEventExists(h.db, event.ID) {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Log the event
	repository.InsertWebhookEvent(h.db, event.ID, event.Type)

	// Route by event type
	switch event.Type {
	case "payment_intent.succeeded":
		h.handlePaymentIntentSucceeded(event)
	default:
		log.Printf("stripe: unhandled webhook event type: %s", event.Type)
	}

	// Mark as processed
	repository.MarkWebhookEventProcessed(h.db, event.ID)

	w.WriteHeader(http.StatusOK)
}

// handlePaymentIntentSucceeded processes payment_intent.succeeded:
//  1. Extract PaymentIntent ID from event data
//  2. Fetch full PaymentIntent from Stripe (thin event pattern)
//  3. Extract order_id from metadata
//  4. Create tickets with signed QR codes (V2 with payment traceability)
//  5. Mark order as CONFIRMED
func (h *Handler) handlePaymentIntentSucceeded(event *WebhookEvent) {
	data := event.Data
	if data == nil {
		log.Printf("stripe: payment_intent.succeeded - no data")
		return
	}

	obj, ok := data["object"].(map[string]interface{})
	if !ok {
		log.Printf("stripe: payment_intent.succeeded - no object in data")
		return
	}

	piID, _ := obj["id"].(string)
	if piID == "" {
		log.Printf("stripe: payment_intent.succeeded - no payment intent id")
		return
	}

	// Fetch full PaymentIntent from Stripe (webhook may send thin data)
	pi, err := h.client.RetrievePaymentIntent(piID)
	if err != nil {
		log.Printf("stripe: retrieve PI %s error: %v", piID, err)
		// Try with event data as fallback
		pi = obj
	}

	// Extract order_id from metadata
	metadata, _ := pi["metadata"].(map[string]interface{})
	orderID, _ := metadata["order_id"].(string)
	if orderID == "" {
		log.Printf("stripe: payment_intent.succeeded but no order_id in metadata (pi %s)", piID)
		return
	}

	// Save payment intent to order
	repository.SetOrderStripePaymentIntentID(h.db, orderID, piID)

	// Verify order is still pending (idempotency)
	orderUserID, status, _, err := repository.OrderByID(h.db, orderID)
	if err != nil || orderUserID == "" {
		log.Printf("stripe: order %s not found", orderID)
		return
	}
	if status != "PENDING" {
		log.Printf("stripe: order %s already %s, skipping ticket creation", orderID, status)
		return
	}

	// Create tickets for each order item
	items, err := repository.OrderItemsByOrderID(h.db, orderID)
	if err != nil {
		log.Printf("stripe: get order items for %s error: %v", orderID, err)
		return
	}

	for _, item := range items {
		evDate, _ := repository.EventDateByID(h.db, item.EventDateID)
		if evDate == nil {
			continue
		}
		ev, _ := repository.EventByID(h.db, evDate.EventID)
		if ev == nil {
			continue
		}

		for i := 0; i < item.Quantity; i++ {
			ticketID := uuid.New().String()
			code := repository.GenerateTicketCode()

			// V2 QR payload: includes payment_intent_id and event_id for traceability
			qrPayload := qrcode.GenerateSignedPayloadV2(ticketID, piID, ev.ID, []byte(h.cfg.JWTSecret))

			err := repository.CreateTicketWithID(
				h.db, ticketID, code, qrPayload,
				orderID, item.ID, orderUserID,
				ev.ID, item.EventDateID, item.TicketTypeID,
			)
			if err != nil {
				log.Printf("stripe: create ticket error: %v", err)
				continue
			}
			repository.IncrementTicketTypeSold(h.db, item.TicketTypeID, 1)
			lotID, _ := repository.LotIDByTicketTypeID(h.db, item.TicketTypeID)
			repository.DecrementLotAvailable(h.db, lotID, 1)
		}
	}

	// Confirm the order
	if err := repository.ConfirmOrder(h.db, orderID); err != nil {
		log.Printf("stripe: confirm order %s error: %v", orderID, err)
	}

	log.Printf("stripe: order %s CONFIRMED via payment_intent.succeeded (pi %s)", orderID, piID)
}
