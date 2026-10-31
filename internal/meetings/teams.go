package meetings

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"golang.org/x/oauth2"
)

// teams imports Microsoft Teams transcripts with delegated Graph permissions.
// getAllTranscripts is application-only, so meetings are found through the
// user's calendar: calendarView → onlineMeetings (by joinWebUrl) → transcripts.
// Tenant prerequisites: an admin consents to OnlineMeetingTranscript.Read.All and
// turns on "Transcript API access" in the Teams admin center (off by default).
// Docs: https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-transcripts
type teams struct {
	creds    envCredentials
	graph    string
	loginURL string
}

func newTeams() *teams {
	return &teams{
		creds:    envCredentials{idVar: "MICROSOFT_TEAMS_CLIENT_ID", secretVar: "MICROSOFT_TEAMS_CLIENT_SECRET"},
		graph:    "https://graph.microsoft.com/v1.0",
		loginURL: "https://login.microsoftonline.com",
	}
}

func (t *teams) ID() string { return "teams" }

func (t *teams) EnvCredentials() AppCredentials {
	app := t.creds.app()
	app.Tenant = strings.TrimSpace(os.Getenv("MICROSOFT_TEAMS_TENANT"))
	return app
}

func (t *teams) OAuthConfig(app AppCredentials, redirectURL string) *oauth2.Config {
	// "organizations" accepts any work or school account; a tenant id pins one directory.
	tenant := strings.TrimSpace(app.Tenant)
	if tenant == "" {
		tenant = "organizations"
	}
	base := t.loginURL + "/" + url.PathEscape(tenant) + "/oauth2/v2.0"
	return &oauth2.Config{
		ClientID:     app.ClientID,
		ClientSecret: app.ClientSecret,
		RedirectURL:  redirectURL,
		Scopes: []string{
			"offline_access",
			"https://graph.microsoft.com/User.Read",
			"https://graph.microsoft.com/Calendars.Read",
			"https://graph.microsoft.com/OnlineMeetings.Read",
			"https://graph.microsoft.com/OnlineMeetingTranscript.Read.All",
		},
		Endpoint: oauth2.Endpoint{AuthURL: base + "/authorize", TokenURL: base + "/token", AuthStyle: oauth2.AuthStyleInParams},
	}
}

func (t *teams) AuthCodeOptions() []oauth2.AuthCodeOption { return nil }

func (t *teams) Account(ctx context.Context, hc *http.Client) (Account, error) {
	var me struct {
		ID                string `json:"id"`
		Mail              string `json:"mail"`
		UserPrincipalName string `json:"userPrincipalName"`
	}
	if err := getJSON(ctx, hc, t.graph+"/me?$select=id,mail,userPrincipalName", &me); err != nil {
		return Account{}, err
	}
	label := me.Mail
	if label == "" {
		label = me.UserPrincipalName
	}
	return Account{ID: me.ID, Label: label}, nil
}

func (t *teams) ListRecordings(ctx context.Context, hc *http.Client, _ Account, since, until time.Time) ([]Recording, error) {
	q := url.Values{}
	q.Set("startDateTime", since.UTC().Format(time.RFC3339))
	q.Set("endDateTime", until.UTC().Format(time.RFC3339))
	q.Set("$select", "subject,isOnlineMeeting,onlineMeetingProvider,onlineMeeting")
	q.Set("$top", "100")
	next := t.graph + "/me/calendarView?" + q.Encode()

	var out []Recording
	seen := map[string]bool{}
	for next != "" {
		var page struct {
			Value []struct {
				Subject               string `json:"subject"`
				OnlineMeetingProvider string `json:"onlineMeetingProvider"`
				OnlineMeeting         *struct {
					JoinURL string `json:"joinUrl"`
				} `json:"onlineMeeting"`
			} `json:"value"`
			NextLink string `json:"@odata.nextLink"`
		}
		if err := getJSON(ctx, hc, next, &page); err != nil {
			return nil, err
		}
		for _, ev := range page.Value {
			if ev.OnlineMeetingProvider != "teamsForBusiness" || ev.OnlineMeeting == nil || ev.OnlineMeeting.JoinURL == "" {
				continue
			}
			// Recurring meetings repeat the same join URL: list their transcripts once.
			if seen[ev.OnlineMeeting.JoinURL] {
				continue
			}
			seen[ev.OnlineMeeting.JoinURL] = true
			recs, err := t.meetingTranscripts(ctx, hc, ev.OnlineMeeting.JoinURL, ev.Subject)
			if err != nil {
				return nil, err
			}
			out = append(out, recs...)
		}
		next = page.NextLink
	}
	return out, nil
}

func (t *teams) meetingTranscripts(ctx context.Context, hc *http.Client, joinURL, subject string) ([]Recording, error) {
	filter := "JoinWebUrl eq '" + strings.ReplaceAll(joinURL, "'", "''") + "'"
	var meetings struct {
		Value []struct {
			ID      string `json:"id"`
			Subject string `json:"subject"`
		} `json:"value"`
	}
	if err := getJSON(ctx, hc, t.graph+"/me/onlineMeetings?$filter="+url.QueryEscape(filter), &meetings); err != nil {
		if isNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []Recording
	for _, m := range meetings.Value {
		title := m.Subject
		if title == "" {
			title = subject
		}
		next := t.graph + "/me/onlineMeetings/" + url.PathEscape(m.ID) + "/transcripts"
		for next != "" {
			var page struct {
				Value []struct {
					ID              string    `json:"id"`
					CreatedDateTime time.Time `json:"createdDateTime"`
				} `json:"value"`
				NextLink string `json:"@odata.nextLink"`
			}
			if err := getJSON(ctx, hc, next, &page); err != nil {
				if isNotFound(err) {
					break
				}
				return nil, err
			}
			for _, tr := range page.Value {
				created := tr.CreatedDateTime
				out = append(out, Recording{
					ExternalID: tr.ID,
					MeetingID:  m.ID,
					Title:      title,
					StartedAt:  &created,
					ContentURL: t.graph + "/me/onlineMeetings/" + url.PathEscape(m.ID) +
						"/transcripts/" + url.PathEscape(tr.ID) + "/content",
				})
			}
			next = page.NextLink
		}
	}
	return out, nil
}

func (t *teams) Transcript(ctx context.Context, hc *http.Client, _ Account, rec Recording) (string, error) {
	body, err := do(ctx, hc, rec.ContentURL, "text/vtt")
	var apiErr *apiError
	if errors.As(err, &apiErr) && apiErr.Status == http.StatusForbidden &&
		strings.Contains(apiErr.Body, "SpeakerAttributionNotAllowed") {
		// The tenant hides speaker names: fall back to the plain-text format.
		body, err = do(ctx, hc, rec.ContentURL, "application/vnd.microsoft.graph.transcript+text")
		if err != nil {
			return "", err
		}
		return strings.TrimSpace(string(body)), nil
	}
	if err != nil {
		return "", err
	}
	return vttToMarkdown(string(body)), nil
}

func isNotFound(err error) bool {
	var apiErr *apiError
	return errors.As(err, &apiErr) && apiErr.Status == http.StatusNotFound
}
