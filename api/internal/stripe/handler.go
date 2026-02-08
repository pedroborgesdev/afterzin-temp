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

// ---------- Checkout ----------

// CreateCheckoutSession handles POST /api/stripe/checkout/create
// Creates a Stripe Checkout Session for an existing order, with PIX + destination charges.
func (h *Handler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
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

	// Get order items
	items, err := repository.OrderItemsByOrderID(h.db, req.OrderID)
	if err != nil || len(items) == 0 {
		respondError(w, http.StatusBadRequest, "pedido sem itens")
		return
	}

	// Build checkout line items and resolve connected account
	var connectedAccountID string
	var totalTickets int
	var lineItems []CheckoutLineItem

	for _, item := range items {
		totalTickets += item.Quantity

		tt, _ := repository.TicketTypeByID(h.db, item.TicketTypeID)
		if tt == nil {
			respondError(w, http.StatusBadRequest, "tipo de ingresso não encontrado")
			return
		}

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

		// Get producer's Stripe connected account
		if connectedAccountID == "" {
			acctID, _ := repository.GetProducerStripeAccountID(h.db, ev.ProducerID)
			if acctID == "" {
				respondError(w, http.StatusBadRequest, "produtor não configurou recebimento de pagamentos")
				return
			}
			connectedAccountID = acctID
		}

		// Ensure ticket type has a Stripe price (create lazily if needed)
		priceID, _ := repository.GetTicketTypeStripePriceID(h.db, tt.ID)
		if priceID == "" {
			productName := fmt.Sprintf("%s - %s", tt.Name, ev.Title)
			desc := ""
			if tt.Description.Valid {
				desc = tt.Description.String
			}
			amountCentavos := int64(tt.Price * 100)
			result, err := h.client.CreateProductWithPrice(productName, desc, amountCentavos)
			if err != nil {
				log.Printf("stripe: create product/price error: %v", err)
				respondError(w, http.StatusInternalServerError, "erro ao criar produto Stripe")
				return
			}
			if err := repository.SetTicketTypeStripeIDs(h.db, tt.ID, result.ProductID, result.PriceID); err != nil {
				log.Printf("stripe: save product ids error: %v", err)
			}
			priceID = result.PriceID
		}

		lineItems = append(lineItems, CheckoutLineItem{
			PriceID:  priceID,
			Quantity: item.Quantity,
		})
	}

	// Create the Stripe Checkout Session
	successURL := h.client.BaseURL + "/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}"
	cancelURL := h.client.BaseURL + "/checkout/cancelado"

	session, err := h.client.CreateCheckoutSession(CheckoutParams{
		OrderID:            req.OrderID,
		ConnectedAccountID: connectedAccountID,
		LineItems:          lineItems,
		TotalTickets:       totalTickets,
		SuccessURL:         successURL,
		CancelURL:          cancelURL,
	})
	if err != nil {
		log.Printf("stripe: create checkout session error: %v", err)
		respondError(w, http.StatusInternalServerError, "erro ao criar sessão de checkout: "+err.Error())
		return
	}

	// Link session to order
	repository.SetOrderStripeSessionID(h.db, req.OrderID, session.SessionID)

	respondJSON(w, http.StatusOK, session)
}

// ---------- Webhooks ----------

// HandleWebhook handles POST /api/stripe/webhook
// Verifies signature, deduplicates, and processes Stripe events.
//
// Handled events:
//   - checkout.session.completed → confirms order, creates tickets
//   - payment_intent.succeeded  → secondary confirmation logging
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
	case "checkout.session.completed":
		h.handleCheckoutCompleted(event)
	case "payment_intent.succeeded":
		h.handlePaymentIntentSucceeded(event)
	default:
		log.Printf("stripe: unhandled webhook event type: %s", event.Type)
	}

	// Mark as processed
	repository.MarkWebhookEventProcessed(h.db, event.ID)

	w.WriteHeader(http.StatusOK)
}

// handleCheckoutCompleted processes checkout.session.completed:
//  1. Fetches full session from Stripe (thin event pattern)
//  2. Extracts order_id from metadata
//  3. Creates tickets with signed QR codes
//  4. Marks order as PAID
func (h *Handler) handleCheckoutCompleted(event *WebhookEvent) {
	data := event.Data
	if data == nil {
		log.Printf("stripe: checkout.session.completed - no data")
		return
	}

	obj, ok := data["object"].(map[string]interface{})
	if !ok {
		log.Printf("stripe: checkout.session.completed - no object in data")
		return
	}

	sessionID, _ := obj["id"].(string)
	if sessionID == "" {
		log.Printf("stripe: checkout.session.completed - no session id")
		return
	}

	// Fetch full session from Stripe (thin events only contain minimal data)
	session, err := h.client.RetrieveCheckoutSession(sessionID)
	if err != nil {
		log.Printf("stripe: retrieve session %s error: %v", sessionID, err)
		return
	}

	// Extract order_id from session metadata
	metadata, _ := session["metadata"].(map[string]interface{})
	orderID, _ := metadata["order_id"].(string)
	if orderID == "" {
		log.Printf("stripe: checkout completed but no order_id in metadata (session %s)", sessionID)
		return
	}

	// Extract payment intent ID
	paymentIntentID, _ := session["payment_intent"].(string)

	// Save payment intent to order
	if paymentIntentID != "" {
		repository.SetOrderStripePaymentIntentID(h.db, orderID, paymentIntentID)
	}

	// Verify order is still pending
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
			qrPayload := qrcode.GenerateSignedPayloadV2(ticketID, paymentIntentID, ev.ID, []byte(h.cfg.JWTSecret))

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

	log.Printf("stripe: order %s confirmed via webhook (session %s, pi %s)", orderID, sessionID, paymentIntentID)
}

// handlePaymentIntentSucceeded logs payment_intent.succeeded events.
// The primary flow is via checkout.session.completed; this is secondary confirmation.
func (h *Handler) handlePaymentIntentSucceeded(event *WebhookEvent) {
	data := event.Data
	if data == nil {
		return
	}

	obj, ok := data["object"].(map[string]interface{})
	if !ok {
		return
	}

	piID, _ := obj["id"].(string)
	log.Printf("stripe: payment_intent.succeeded: %s", piID)
}
