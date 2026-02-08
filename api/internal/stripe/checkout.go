package stripe

import (
	"fmt"
	"net/url"
	"strconv"
)

// PixPaymentParams holds parameters for creating a PIX PaymentIntent.
type PixPaymentParams struct {
	OrderID            string // Internal order ID (metadata)
	ConnectedAccountID string // Producer's Stripe account (destination)
	AmountCentavos     int64  // Total amount in BRL centavos
	TotalTickets       int    // Ticket count for fee calculation
	Description        string // Description shown on PIX
}

// PixPaymentResult contains the PaymentIntent data needed by the frontend.
type PixPaymentResult struct {
	PaymentIntentID string `json:"paymentIntentId"`
	ClientSecret    string `json:"clientSecret"`
	PixQRCode       string `json:"pixQrCode,omitempty"`    // QR Code image URL (PNG)
	PixCopyPaste    string `json:"pixCopyPaste,omitempty"` // Copia-e-cola string
	ExpiresAt       int64  `json:"expiresAt,omitempty"`    // Unix timestamp when PIX expires
	Status          string `json:"status"`                 // PaymentIntent status
}

// CreatePixPaymentIntent creates a PaymentIntent with PIX as payment method.
//
// PIX flow via Stripe V1 API:
//  1. Create PaymentIntent with payment_method_types=["pix"], confirm=true
//  2. Stripe generates QR code + copia-e-cola automatically
//  3. Return QR code + copia-e-cola to frontend for display
//  4. Customer scans/pastes in banking app
//  5. Webhook payment_intent.succeeded fires when paid
//
// Destination Charges:
//   - application_fee_amount = R$5.00 × ticket count (platform retains)
//   - transfer_data.destination = producer's connected account
//   - Stripe fees deducted normally
func (c *Client) CreatePixPaymentIntent(params PixPaymentParams) (*PixPaymentResult, error) {
	totalFee := c.ApplicationFee * int64(params.TotalTickets)

	formParams := url.Values{}
	formParams.Set("amount", strconv.FormatInt(params.AmountCentavos, 10))
	formParams.Set("currency", "brl")
	formParams.Set("payment_method_types[0]", "pix")
	formParams.Set("confirm", "true") // Auto-confirm to generate PIX QR code immediately

	if params.Description != "" {
		formParams.Set("description", params.Description)
	}

	// Destination charges: split payment to producer
	formParams.Set("application_fee_amount", strconv.FormatInt(totalFee, 10))
	formParams.Set("transfer_data[destination]", params.ConnectedAccountID)

	// Metadata for webhook reconciliation
	formParams.Set("metadata[order_id]", params.OrderID)
	formParams.Set("metadata[total_tickets]", strconv.Itoa(params.TotalTickets))

	result, err := c.v1Form("POST", "/payment_intents", formParams)
	if err != nil {
		return nil, fmt.Errorf("create pix payment intent: %w", err)
	}

	piID, _ := result["id"].(string)
	clientSecret, _ := result["client_secret"].(string)
	piStatus, _ := result["status"].(string)

	if piID == "" {
		return nil, fmt.Errorf("no payment_intent id in response")
	}

	pixResult := &PixPaymentResult{
		PaymentIntentID: piID,
		ClientSecret:    clientSecret,
		Status:          piStatus,
	}

	// Extract PIX QR code and copia-e-cola from next_action.pix_display_qr_code
	if nextAction, ok := result["next_action"].(map[string]interface{}); ok {
		if pixDisplay, ok := nextAction["pix_display_qr_code"].(map[string]interface{}); ok {
			if qr, ok := pixDisplay["image_url_png"].(string); ok {
				pixResult.PixQRCode = qr
			}
			if pixResult.PixQRCode == "" {
				if qr, ok := pixDisplay["image_url_svg"].(string); ok {
					pixResult.PixQRCode = qr
				}
			}
			if code, ok := pixDisplay["data"].(string); ok {
				pixResult.PixCopyPaste = code
			}
			if exp, ok := pixDisplay["expires_at"].(float64); ok {
				pixResult.ExpiresAt = int64(exp)
			}
		}
	}

	return pixResult, nil
}

// RetrievePaymentIntent fetches details of a payment intent.
func (c *Client) RetrievePaymentIntent(paymentIntentID string) (map[string]interface{}, error) {
	return c.v1Form("GET", "/payment_intents/"+paymentIntentID, nil)
}

// GetPaymentIntentStatus retrieves a PaymentIntent and returns a simplified status.
// Used for frontend polling while waiting for PIX payment.
func (c *Client) GetPaymentIntentStatus(paymentIntentID string) (*PixPaymentResult, error) {
	result, err := c.RetrievePaymentIntent(paymentIntentID)
	if err != nil {
		return nil, fmt.Errorf("retrieve payment intent: %w", err)
	}

	piID, _ := result["id"].(string)
	status, _ := result["status"].(string)

	pixResult := &PixPaymentResult{
		PaymentIntentID: piID,
		Status:          status,
	}

	// Re-extract PIX data if still pending
	if nextAction, ok := result["next_action"].(map[string]interface{}); ok {
		if pixDisplay, ok := nextAction["pix_display_qr_code"].(map[string]interface{}); ok {
			if qr, ok := pixDisplay["image_url_png"].(string); ok {
				pixResult.PixQRCode = qr
			}
			if code, ok := pixDisplay["data"].(string); ok {
				pixResult.PixCopyPaste = code
			}
			if exp, ok := pixDisplay["expires_at"].(float64); ok {
				pixResult.ExpiresAt = int64(exp)
			}
		}
	}

	return pixResult, nil
}
