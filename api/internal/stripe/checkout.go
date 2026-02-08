package stripe

import (
	"fmt"
	"net/url"
	"strconv"
)

// CheckoutLineItem represents a single line item for the Stripe Checkout Session.
type CheckoutLineItem struct {
	PriceID  string
	Quantity int
}

// CheckoutParams holds all parameters needed to create a Stripe Checkout Session.
type CheckoutParams struct {
	OrderID            string             // Internal order ID (stored in metadata)
	ConnectedAccountID string             // Producer's Stripe account (destination)
	LineItems          []CheckoutLineItem // Products to charge for
	TotalTickets       int                // Total ticket count for fee calculation
	SuccessURL         string             // Where to redirect after successful payment
	CancelURL          string             // Where to redirect if customer cancels
}

// CheckoutResult contains the created session ID and redirect URL.
type CheckoutResult struct {
	SessionID string `json:"sessionId"`
	URL       string `json:"url"`
}

// CreateCheckoutSession creates a Stripe Checkout Session with:
//   - PIX as payment method
//   - Destination charges (money flows to connected account)
//   - Application fee of R$5.00 per ticket retained by platform
//
// Flow:
//  1. Customer pays via PIX on Stripe's hosted page
//  2. Platform retains R$5.00 × ticket count
//  3. Remaining amount transfers to producer's connected account
//  4. Stripe fees deducted normally
func (c *Client) CreateCheckoutSession(params CheckoutParams) (*CheckoutResult, error) {
	// Application fee = R$5.00 (500 centavos) per ticket
	totalFee := c.ApplicationFee * int64(params.TotalTickets)

	formParams := url.Values{}
	formParams.Set("mode", "payment")
	formParams.Set("payment_method_types[0]", "pix")

	// Line items
	for i, item := range params.LineItems {
		prefix := fmt.Sprintf("line_items[%d]", i)
		formParams.Set(prefix+"[price]", item.PriceID)
		formParams.Set(prefix+"[quantity]", strconv.Itoa(item.Quantity))
	}

	// Destination charges with application fee
	formParams.Set("payment_intent_data[application_fee_amount]", strconv.FormatInt(totalFee, 10))
	formParams.Set("payment_intent_data[transfer_data][destination]", params.ConnectedAccountID)

	// Metadata links back to our internal order
	formParams.Set("metadata[order_id]", params.OrderID)
	formParams.Set("payment_intent_data[metadata][order_id]", params.OrderID)

	// Redirect URLs
	formParams.Set("success_url", params.SuccessURL)
	formParams.Set("cancel_url", params.CancelURL)

	result, err := c.v1Form("POST", "/checkout/sessions", formParams)
	if err != nil {
		return nil, fmt.Errorf("create checkout session: %w", err)
	}

	sessionID, _ := result["id"].(string)
	sessionURL, _ := result["url"].(string)

	if sessionID == "" || sessionURL == "" {
		return nil, fmt.Errorf("missing session id or url in response")
	}

	return &CheckoutResult{
		SessionID: sessionID,
		URL:       sessionURL,
	}, nil
}

// RetrieveCheckoutSession fetches full details of an existing checkout session.
// Used by webhook handler to get metadata after thin event notification.
func (c *Client) RetrieveCheckoutSession(sessionID string) (map[string]interface{}, error) {
	return c.v1Form("GET", "/checkout/sessions/"+sessionID, nil)
}

// RetrievePaymentIntent fetches details of a payment intent.
func (c *Client) RetrievePaymentIntent(paymentIntentID string) (map[string]interface{}, error) {
	return c.v1Form("GET", "/payment_intents/"+paymentIntentID, nil)
}
