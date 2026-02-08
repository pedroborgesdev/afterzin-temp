package stripe

import (
	"encoding/json"
	"fmt"
	"log"
)

// AccountStatus holds the onboarding status of a Stripe Connect account.
type AccountStatus struct {
	AccountID          string `json:"accountId"`
	OnboardingComplete bool   `json:"onboardingComplete"`
	TransfersActive    bool   `json:"transfersActive"`
	DetailsSubmitted   bool   `json:"detailsSubmitted"`
	PayoutsEnabled     bool   `json:"payoutsEnabled"`
}

// CreateConnectedAccount creates a new Stripe Connect Express account using V2 API.
//
// This follows the Stripe Connect V2 pattern:
//   - Platform is merchant of record (fees_collector + losses_collector = application)
//   - Dashboard type is "express" for simplified onboarding
//   - Country is "BR" (Brazil)
//   - Requests stripe_transfers capability for destination charges
func (c *Client) CreateConnectedAccount(displayName, email string) (string, error) {
	body := map[string]interface{}{
		"display_name":  displayName,
		"contact_email": email,
		"identity": map[string]interface{}{
			"country": "BR",
		},
		"dashboard": "express",
		"defaults": map[string]interface{}{
			"responsibilities": map[string]interface{}{
				"fees_collector":   "application",
				"losses_collector": "application",
			},
		},
		"configuration": map[string]interface{}{
			"merchant": map[string]interface{}{
				"capabilities": map[string]interface{}{
					"card_payments": map[string]interface{}{
						"requested": true,
					},
				},
			},
			"recipient": map[string]interface{}{
				"capabilities": map[string]interface{}{
					"stripe_balance": map[string]interface{}{
						"stripe_transfers": map[string]interface{}{
							"requested": true,
						},
					},
				},
			},
		},
	}

	result, err := c.v2JSON("POST", "/v2/core/accounts", body)
	if err != nil {
		return "", fmt.Errorf("create connected account: %w", err)
	}

	accountID, ok := result["id"].(string)
	if !ok || accountID == "" {
		return "", fmt.Errorf("no account id in response")
	}

	return accountID, nil
}

// CreateAccountLink creates a V2 Account Link for producer onboarding.
// The link sends the producer to Stripe's hosted onboarding flow.
//
// refreshURL: where to redirect if the link expires
// returnURL:  where to redirect after onboarding completes
func (c *Client) CreateAccountLink(accountID, refreshURL, returnURL string) (string, error) {
	body := map[string]interface{}{
		"account": accountID,
		"use_case": map[string]interface{}{
			"type": "account_onboarding",
			"account_onboarding": map[string]interface{}{
				"configurations": []string{"recipient", "merchant"},
				"refresh_url":    refreshURL,
				"return_url":     returnURL,
			},
		},
	}

	result, err := c.v2JSON("POST", "/v2/core/account_links", body)
	if err != nil {
		return "", fmt.Errorf("create account link: %w", err)
	}

	linkURL, ok := result["url"].(string)
	if !ok || linkURL == "" {
		return "", fmt.Errorf("no url in account link response")
	}

	return linkURL, nil
}

// GetAccountStatus retrieves the onboarding status of a connected account via V2 API.
func (c *Client) GetAccountStatus(accountID string) (*AccountStatus, error) {
	result, err := c.v2JSON("GET", "/v2/core/accounts/"+accountID, nil)
	if err != nil {
		return nil, fmt.Errorf("get account status: %w", err)
	}

	// Log full response for debugging
	raw, _ := json.MarshalIndent(result, "", "  ")
	log.Printf("stripe: GET /v2/core/accounts/%s response:\n%s", accountID, string(raw))

	status := &AccountStatus{
		AccountID: accountID,
	}

	// V2 API: check requirements to determine if onboarding is complete
	if requirements, ok := result["requirements"].(map[string]interface{}); ok {
		// If currently_due is empty or nil, onboarding is complete
		currentlyDue, _ := requirements["currently_due"].([]interface{})
		status.DetailsSubmitted = len(currentlyDue) == 0
	}

	// Navigate: configuration → recipient → capabilities → stripe_balance → stripe_transfers → status
	if config, ok := result["configuration"].(map[string]interface{}); ok {
		if recipient, ok := config["recipient"].(map[string]interface{}); ok {
			if caps, ok := recipient["capabilities"].(map[string]interface{}); ok {
				if sb, ok := caps["stripe_balance"].(map[string]interface{}); ok {
					if st, ok := sb["stripe_transfers"].(map[string]interface{}); ok {
						if s, ok := st["status"].(string); ok {
							log.Printf("stripe: stripe_transfers.status = %q", s)
							status.TransfersActive = s == "active"
						}
					}
				}
			}
		}
		// Also check merchant capabilities
		if merchant, ok := config["merchant"].(map[string]interface{}); ok {
			if caps, ok := merchant["capabilities"].(map[string]interface{}); ok {
				if cp, ok := caps["card_payments"].(map[string]interface{}); ok {
					if s, ok := cp["status"].(string); ok {
						log.Printf("stripe: card_payments.status = %q", s)
						status.PayoutsEnabled = s == "active"
					}
				}
			}
		}
	}

	// Onboarding is complete when transfers are active OR details are fully submitted
	status.OnboardingComplete = status.TransfersActive || status.DetailsSubmitted

	return status, nil
}
