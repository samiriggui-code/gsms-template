// Package meetings imports meeting transcripts from Microsoft Teams, Zoom and
// Google Meet into knowledge bases. Each tenant links one account per platform
// through the platform's OAuth consent page; an hourly job imports new transcripts.
package meetings

import (
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	"golang.org/x/oauth2"
)

// Recording is one transcript available on a platform.
type Recording struct {
	// ExternalID uniquely identifies the transcript on its platform; it is the dedupe key.
	ExternalID string
	MeetingID  string
	Title      string
	StartedAt  *time.Time
	// ContentURL is where the provider downloads the transcript from, when it has one.
	ContentURL string
}

// Account identifies the platform user behind a connection.
type Account struct {
	ID    string
	Label string
}

// AppCredentials is the OAuth app the admin registered with the platform.
type AppCredentials struct {
	ClientID     string
	ClientSecret string
	// Tenant is the Microsoft Entra tenant (Teams only).
	Tenant string
}

// Complete reports whether both the client id and secret are set.
func (a AppCredentials) Complete() bool {
	return strings.TrimSpace(a.ClientID) != "" && strings.TrimSpace(a.ClientSecret) != ""
}

// Provider is one meeting platform.
type Provider interface {
	ID() string
	// EnvCredentials returns the optional server-wide app from the environment.
	EnvCredentials() AppCredentials
	OAuthConfig(app AppCredentials, redirectURL string) *oauth2.Config
	AuthCodeOptions() []oauth2.AuthCodeOption
	Account(ctx context.Context, hc *http.Client) (Account, error)
	// ListRecordings returns transcripts of meetings that started between since and until.
	ListRecordings(ctx context.Context, hc *http.Client, acct Account, since, until time.Time) ([]Recording, error)
	// Transcript returns the transcript as Markdown, or "" when it is not ready yet.
	Transcript(ctx context.Context, hc *http.Client, acct Account, rec Recording) (string, error)
}

// envCredentials reads an OAuth client id and secret from the environment.
type envCredentials struct {
	idVar, secretVar string
}

func (e envCredentials) app() AppCredentials {
	return AppCredentials{
		ClientID:     strings.TrimSpace(os.Getenv(e.idVar)),
		ClientSecret: strings.TrimSpace(os.Getenv(e.secretVar)),
	}
}

// publicURLEnv is the externally reachable base URL used to build the OAuth
// redirect URL registered on each platform (e.g. https://app.example.com).
const publicURLEnv = "MEETINGS_PUBLIC_URL"

// CallbackPath is the single OAuth redirect path shared by every provider.
const CallbackPath = "/api/v1/integrations/meetings-oauth/callback"

// RedirectURL returns the OAuth redirect URL, from MEETINGS_PUBLIC_URL or else
// from the base URL of the current request.
func RedirectURL(requestBase string) string {
	base := strings.TrimSpace(os.Getenv(publicURLEnv))
	if base == "" {
		base = requestBase
	}
	return strings.TrimRight(base, "/") + CallbackPath
}

// DefaultProviders returns Teams, Zoom and Google Meet configured from the environment.
func DefaultProviders() []Provider {
	return []Provider{newTeams(), newZoom(), newGoogleMeet()}
}
