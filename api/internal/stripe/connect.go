package stripe

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
)

// AccountStatus holds the onboarding status of a Stripe Connect account.
type AccountStatus struct {
	AccountID          string `json:"accountId"`
	OnboardingComplete bool   `json:"onboardingComplete"`
	TransfersActive    bool   `json:"transfersActive"`
	DetailsSubmitted   bool   `json:"detailsSubmitted"`
	PayoutsEnabled     bool   `json:"payoutsEnabled"`
}

// CreateConnectedAccount creates a new Stripe Connect Express account using V1 API.
//
// Uses V1 because PIX is only available on V1 accounts.
//   - type=express for simplified onboarding
//   - country=BR (Brazil)
//   - Requests card_payments + transfers capabilities
//   - Platform is payment facilitator (retains application fee)
func (c *Client) CreateConnectedAccount(displayName, email string) (string, error) {
	params := url.Values{}
	params.Set("type", "express")
	params.Set("country", "BR")
	params.Set("email", email)
	params.Set("business_type", "individual")
	params.Set("capabilities[card_payments][requested]", "true")
	params.Set("capabilities[transfers][requested]", "true")
	params.Set("capabilities[pix_payments][requested]", "true")
	params.Set("business_profile[name]", displayName)
	params.Set("settings[payouts][schedule][interval]", "manual")

	result, err := c.v1Form("POST", "/accounts", params)
	if err != nil {
		return "", fmt.Errorf("create connected account: %w", err)
	}

	accountID, _ := result["id"].(string)
	if accountID == "" {
		return "", fmt.Errorf("no account id in response")
	}

	return accountID, nil
}

// CreateAccountLink creates a V1 Account Link for producer onboarding.
// The link sends the producer to Stripe's hosted onboarding flow.
func (c *Client) CreateAccountLink(accountID, refreshURL, returnURL string) (string, error) {
	params := url.Values{}
	params.Set("account", accountID)
	params.Set("type", "account_onboarding")
	params.Set("refresh_url", refreshURL)
	params.Set("return_url", returnURL)

	result, err := c.v1Form("POST", "/account_links", params)
	if err != nil {
		return "", fmt.Errorf("create account link: %w", err)
	}

	linkURL, _ := result["url"].(string)
	if linkURL == "" {
		return "", fmt.Errorf("no url in account link response")
	}

	return linkURL, nil
}

// GetAccountStatus retrieves the onboarding status of a connected account via V1 API.
func (c *Client) GetAccountStatus(accountID string) (*AccountStatus, error) {
	result, err := c.v1Form("GET", "/accounts/"+accountID, nil)
	if err != nil {
		return nil, fmt.Errorf("get account status: %w", err)
	}

	// Log full response for debugging
	raw, _ := json.MarshalIndent(result, "", "  ")
	log.Printf("stripe: GET /v1/accounts/%s response:\n%s", accountID, string(raw))

	status := &AccountStatus{
		AccountID: accountID,
	}

	// V1 fields are straightforward booleans
	if ds, ok := result["details_submitted"].(bool); ok {
		status.DetailsSubmitted = ds
	}
	if pe, ok := result["payouts_enabled"].(bool); ok {
		status.PayoutsEnabled = pe
	}
	if ce, ok := result["charges_enabled"].(bool); ok {
		status.TransfersActive = ce
	}

	// Check capabilities for transfers specifically
	if caps, ok := result["capabilities"].(map[string]interface{}); ok {
		if transfers, ok := caps["transfers"].(string); ok {
			log.Printf("stripe: capabilities.transfers = %q", transfers)
			if transfers == "active" {
				status.TransfersActive = true
			}
		}
		if pix, ok := caps["pix_payments"].(string); ok {
			log.Printf("stripe: capabilities.pix_payments = %q", pix)
		}
	}

	// Onboarding is complete when details are submitted
	status.OnboardingComplete = status.DetailsSubmitted

	return status, nil
}
