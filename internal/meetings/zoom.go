package meetings

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"golang.org/x/oauth2"
)

// Zoom imports the audio transcripts of cloud recordings (user-managed OAuth app).
// Requires a Pro plan or higher with cloud recording and audio transcripts on.
// Docs: https://developers.zoom.us/docs/api/meetings/#tag/cloud-recording
type zoom struct {
	creds   envCredentials
	apiBase string
	authURL string
	tokURL  string
}

func newZoom() *zoom {
	return &zoom{
		creds:   envCredentials{idVar: "ZOOM_CLIENT_ID", secretVar: "ZOOM_CLIENT_SECRET"},
		apiBase: "https://api.zoom.us/v2",
		authURL: "https://zoom.us/oauth/authorize",
		tokURL:  "https://zoom.us/oauth/token",
	}
}

func (z *zoom) ID() string       { return "zoom" }
func (z *zoom) Configured() bool { return z.creds.configured() }

func (z *zoom) OAuthConfig(redirectURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     z.creds.id(),
		ClientSecret: z.creds.secret(),
		RedirectURL:  redirectURL,
		// Scopes are chosen on the Zoom app page, not in the request.
		Endpoint: oauth2.Endpoint{AuthURL: z.authURL, TokenURL: z.tokURL, AuthStyle: oauth2.AuthStyleInHeader},
	}
}

func (z *zoom) AuthCodeOptions() []oauth2.AuthCodeOption { return nil }

func (z *zoom) Account(ctx context.Context, hc *http.Client) (Account, error) {
	var me struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	}
	if err := getJSON(ctx, hc, z.apiBase+"/users/me", &me); err != nil {
		return Account{}, err
	}
	return Account{ID: me.ID, Label: me.Email}, nil
}

// zoomMaxRange is the longest from/to window the recordings endpoint accepts.
const zoomMaxRange = 30 * 24 * time.Hour

func (z *zoom) ListRecordings(ctx context.Context, hc *http.Client, _ Account, since, until time.Time) ([]Recording, error) {
	var out []Recording
	for from := since; from.Before(until); from = from.Add(zoomMaxRange) {
		to := from.Add(zoomMaxRange)
		if to.After(until) {
			to = until
		}
		token := ""
		for {
			q := url.Values{}
			q.Set("from", from.UTC().Format("2006-01-02"))
			q.Set("to", to.UTC().Format("2006-01-02"))
			q.Set("page_size", "300")
			if token != "" {
				q.Set("next_page_token", token)
			}
			var resp struct {
				NextPageToken string `json:"next_page_token"`
				Meetings      []struct {
					UUID           string    `json:"uuid"`
					Topic          string    `json:"topic"`
					StartTime      time.Time `json:"start_time"`
					RecordingFiles []struct {
						ID          string `json:"id"`
						FileType    string `json:"file_type"`
						Status      string `json:"status"`
						DownloadURL string `json:"download_url"`
					} `json:"recording_files"`
				} `json:"meetings"`
			}
			if err := getJSON(ctx, hc, z.apiBase+"/users/me/recordings?"+q.Encode(), &resp); err != nil {
				return nil, err
			}
			for _, m := range resp.Meetings {
				for _, f := range m.RecordingFiles {
					if f.FileType != "TRANSCRIPT" || f.Status != "completed" || f.DownloadURL == "" {
						continue
					}
					started := m.StartTime
					out = append(out, Recording{
						ExternalID: f.ID,
						MeetingID:  m.UUID,
						Title:      m.Topic,
						StartedAt:  &started,
						ContentURL: f.DownloadURL,
					})
				}
			}
			if resp.NextPageToken == "" {
				break
			}
			token = resp.NextPageToken
		}
	}
	return out, nil
}

func (z *zoom) Transcript(ctx context.Context, hc *http.Client, _ Account, rec Recording) (string, error) {
	vtt, err := getText(ctx, hc, rec.ContentURL)
	if err != nil {
		return "", err
	}
	return vttToMarkdown(vtt), nil
}

// maxBody caps API and transcript responses.
const maxBody = 32 << 20

// apiError is returned for non-2xx responses; Unauthorized marks a revoked or expired grant.
type apiError struct {
	Status int
	Body   string
}

func (e *apiError) Error() string { return fmt.Sprintf("HTTP %d: %s", e.Status, e.Body) }

func do(ctx context.Context, hc *http.Client, rawURL string, accept string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	if accept != "" {
		req.Header.Set("Accept", accept)
	}
	resp, err := hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBody))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		snippet := string(body)
		if len(snippet) > 300 {
			snippet = snippet[:300]
		}
		return nil, &apiError{Status: resp.StatusCode, Body: snippet}
	}
	return body, nil
}

func getJSON(ctx context.Context, hc *http.Client, rawURL string, out any) error {
	body, err := do(ctx, hc, rawURL, "application/json")
	if err != nil {
		return err
	}
	return json.Unmarshal(body, out)
}

func getText(ctx context.Context, hc *http.Client, rawURL string) (string, error) {
	body, err := do(ctx, hc, rawURL, "")
	if err != nil {
		return "", err
	}
	return string(body), nil
}
