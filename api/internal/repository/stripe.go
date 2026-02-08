package repository

import (
	"database/sql"

	"github.com/google/uuid"
)

// ---------- Producer Stripe fields ----------

// GetProducerStripeAccountID returns the Stripe Connect account ID for a producer.
func GetProducerStripeAccountID(db *sql.DB, producerID string) (string, error) {
	var acctID sql.NullString
	err := db.QueryRow(`SELECT stripe_account_id FROM producers WHERE id = ?`, producerID).Scan(&acctID)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return acctID.String, nil
}

// SetProducerStripeAccountID saves the Stripe Connect account ID for a producer.
func SetProducerStripeAccountID(db *sql.DB, producerID, stripeAccountID string) error {
	_, err := db.Exec(`UPDATE producers SET stripe_account_id = ? WHERE id = ?`, stripeAccountID, producerID)
	return err
}

// GetProducerOnboardingComplete returns whether the producer has completed Stripe onboarding.
func GetProducerOnboardingComplete(db *sql.DB, producerID string) (bool, error) {
	var complete int
	err := db.QueryRow(`SELECT stripe_onboarding_complete FROM producers WHERE id = ?`, producerID).Scan(&complete)
	if err != nil {
		return false, err
	}
	return complete == 1, nil
}

// SetProducerOnboardingComplete updates the onboarding complete flag.
func SetProducerOnboardingComplete(db *sql.DB, producerID string, complete bool) error {
	v := 0
	if complete {
		v = 1
	}
	_, err := db.Exec(`UPDATE producers SET stripe_onboarding_complete = ? WHERE id = ?`, v, producerID)
	return err
}

// GetProducerPixKey returns the PIX key and type for a producer.
func GetProducerPixKey(db *sql.DB, producerID string) (pixKey string, pixKeyType string, err error) {
	var pk, pkt sql.NullString
	err = db.QueryRow(`SELECT pix_key, pix_key_type FROM producers WHERE id = ?`, producerID).Scan(&pk, &pkt)
	if err != nil {
		return "", "", err
	}
	return pk.String, pkt.String, nil
}

// SetProducerPixKey updates the producer's PIX key.
// Business rule: only allowed when ALL producer events are paused/draft.
func SetProducerPixKey(db *sql.DB, producerID, pixKey, pixKeyType string) error {
	_, err := db.Exec(`UPDATE producers SET pix_key = ?, pix_key_type = ? WHERE id = ?`, pixKey, pixKeyType, producerID)
	return err
}

// AllProducerEventsPaused returns true if the producer has no active/published events.
// (All must be PAUSED or DRAFT for PIX key changes to be allowed.)
func AllProducerEventsPaused(db *sql.DB, producerID string) (bool, error) {
	var count int
	err := db.QueryRow(
		`SELECT COUNT(*) FROM events WHERE producer_id = ? AND status NOT IN ('PAUSED', 'DRAFT')`,
		producerID,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count == 0, nil
}

// ---------- Ticket Type Stripe fields ----------

// GetTicketTypeStripePriceID returns the Stripe Price ID for a ticket type.
func GetTicketTypeStripePriceID(db *sql.DB, ticketTypeID string) (string, error) {
	var priceID sql.NullString
	err := db.QueryRow(`SELECT stripe_price_id FROM ticket_types WHERE id = ?`, ticketTypeID).Scan(&priceID)
	if err != nil {
		return "", err
	}
	return priceID.String, nil
}

// SetTicketTypeStripeIDs saves Stripe Product and Price IDs for a ticket type.
func SetTicketTypeStripeIDs(db *sql.DB, ticketTypeID, productID, priceID string) error {
	_, err := db.Exec(
		`UPDATE ticket_types SET stripe_product_id = ?, stripe_price_id = ? WHERE id = ?`,
		productID, priceID, ticketTypeID,
	)
	return err
}

// ---------- Order Stripe fields ----------

// SetOrderStripeSessionID saves the Stripe Checkout Session ID on an order.
func SetOrderStripeSessionID(db *sql.DB, orderID, sessionID string) error {
	_, err := db.Exec(`UPDATE orders SET stripe_checkout_session_id = ? WHERE id = ?`, sessionID, orderID)
	return err
}

// SetOrderStripePaymentIntentID saves the Stripe Payment Intent ID on an order.
func SetOrderStripePaymentIntentID(db *sql.DB, orderID, paymentIntentID string) error {
	_, err := db.Exec(`UPDATE orders SET stripe_payment_intent_id = ? WHERE id = ?`, paymentIntentID, orderID)
	return err
}

// GetOrderStripePaymentIntentID retrieves the Stripe Payment Intent ID for an order.
func GetOrderStripePaymentIntentID(db *sql.DB, orderID string) (string, error) {
	var piID sql.NullString
	err := db.QueryRow(`SELECT stripe_payment_intent_id FROM orders WHERE id = ?`, orderID).Scan(&piID)
	if err != nil {
		return "", err
	}
	return piID.String, nil
}

// OrderByStripeSessionID finds an order by its Stripe Checkout Session ID.
func OrderByStripeSessionID(db *sql.DB, sessionID string) (orderID string, err error) {
	err = db.QueryRow(`SELECT id FROM orders WHERE stripe_checkout_session_id = ?`, sessionID).Scan(&orderID)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return orderID, err
}

// ---------- Webhook Events ----------

// WebhookEventExists checks if a webhook event has already been received (idempotency).
func WebhookEventExists(db *sql.DB, stripeEventID string) bool {
	var exists int
	err := db.QueryRow(`SELECT COUNT(*) FROM stripe_webhook_events WHERE stripe_event_id = ?`, stripeEventID).Scan(&exists)
	return err == nil && exists > 0
}

// InsertWebhookEvent logs a received webhook event.
func InsertWebhookEvent(db *sql.DB, stripeEventID, eventType string) error {
	id := uuid.New().String()
	_, err := db.Exec(
		`INSERT OR IGNORE INTO stripe_webhook_events (id, stripe_event_id, event_type) VALUES (?, ?, ?)`,
		id, stripeEventID, eventType,
	)
	return err
}

// MarkWebhookEventProcessed marks a webhook event as successfully processed.
func MarkWebhookEventProcessed(db *sql.DB, stripeEventID string) error {
	_, err := db.Exec(`UPDATE stripe_webhook_events SET processed = 1 WHERE stripe_event_id = ?`, stripeEventID)
	return err
}
