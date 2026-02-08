package stripe

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

// WebhookEvent represents a parsed Stripe webhook event.
type WebhookEvent struct {
	ID      string                 `json:"id"`
	Type    string                 `json:"type"`
	Data    map[string]interface{} `json:"data"`
	Created int64                  `json:"created"`
}

// VerifyWebhookSignature verifies the Stripe-Signature header against the payload.
//
// Algorithm:
//  1. Parse header for timestamp (t) and signatures (v1)
//  2. Compute HMAC-SHA256 of "{timestamp}.{payload}" using webhook secret
//  3. Compare computed signature with provided v1 signatures
//  4. Reject if timestamp is older than 5 minutes (replay protection)
func (c *Client) VerifyWebhookSignature(payload []byte, sigHeader string) (*WebhookEvent, error) {
	if c.WebhookSecret == "" {
		return nil, fmt.Errorf("webhook secret not configured")
	}

	// Parse Stripe-Signature: t=timestamp,v1=sig1,v1=sig2,...
	parts := strings.Split(sigHeader, ",")
	var timestamp string
	var signatures []string
	for _, part := range parts {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "t":
			timestamp = kv[1]
		case "v1":
			signatures = append(signatures, kv[1])
		}
	}

	if timestamp == "" || len(signatures) == 0 {
		return nil, fmt.Errorf("invalid signature header format")
	}

	// Verify timestamp freshness (5 minute tolerance)
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid timestamp: %w", err)
	}
	if math.Abs(float64(time.Now().Unix()-ts)) > 300 {
		return nil, fmt.Errorf("webhook timestamp too old or too far in the future")
	}

	// Compute expected signature
	signedPayload := timestamp + "." + string(payload)
	mac := hmac.New(sha256.New, []byte(c.WebhookSecret))
	mac.Write([]byte(signedPayload))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	// Check if any provided signature matches
	valid := false
	for _, sig := range signatures {
		if hmac.Equal([]byte(sig), []byte(expectedSig)) {
			valid = true
			break
		}
	}
	if !valid {
		return nil, fmt.Errorf("signature verification failed")
	}

	// Parse the event body
	var event WebhookEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		return nil, fmt.Errorf("parse event: %w", err)
	}

	return &event, nil
}
