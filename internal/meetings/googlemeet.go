package meetings

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"golang.org/x/oauth2"
)

// googleMeet imports transcripts through the Meet REST API v2. Transcripts
// exist on Business Standard and higher Workspace editions; entries are
// deleted 30 days after the conference ends.
// Docs: https://developers.google.com/workspace/meet/api/guides/artifacts
type googleMeet struct {
	creds   envCredentials
	apiBase string
	infoURL string
	authURL string
	tokURL  string
}

func newGoogleMeet() *googleMeet {
	return &googleMeet{
		creds:   envCredentials{idVar: "GOOGLE_MEET_CLIENT_ID", secretVar: "GOOGLE_MEET_CLIENT_SECRET"},
		apiBase: "https://meet.googleapis.com/v2",
		infoURL: "https://openidconnect.googleapis.com/v1/userinfo",
		authURL: "https://accounts.google.com/o/oauth2/v2/auth",
		tokURL:  "https://oauth2.googleapis.com/token",
	}
}

func (g *googleMeet) ID() string       { return "google_meet" }
func (g *googleMeet) Configured() bool { return g.creds.configured() }

func (g *googleMeet) OAuthConfig(redirectURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     g.creds.id(),
		ClientSecret: g.creds.secret(),
		RedirectURL:  redirectURL,
		// meetings.space.readonly is "sensitive" (app verification), not "restricted":
		// entries are read through the API, never from the Docs file in Drive.
		Scopes:   []string{"openid", "email", "https://www.googleapis.com/auth/meetings.space.readonly"},
		Endpoint: oauth2.Endpoint{AuthURL: g.authURL, TokenURL: g.tokURL, AuthStyle: oauth2.AuthStyleInParams},
	}
}

// AuthCodeOptions asks for a refresh token every time, so reconnecting works.
func (g *googleMeet) AuthCodeOptions() []oauth2.AuthCodeOption {
	return []oauth2.AuthCodeOption{oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("prompt", "consent")}
}

func (g *googleMeet) Account(ctx context.Context, hc *http.Client) (Account, error) {
	var info struct {
		Sub   string `json:"sub"`
		Email string `json:"email"`
	}
	if err := getJSON(ctx, hc, g.infoURL, &info); err != nil {
		return Account{}, err
	}
	return Account{ID: info.Sub, Label: info.Email}, nil
}

func (g *googleMeet) ListRecordings(ctx context.Context, hc *http.Client, _ Account, since, until time.Time) ([]Recording, error) {
	filter := fmt.Sprintf(`start_time>="%s" AND start_time<="%s"`,
		since.UTC().Format(time.RFC3339), until.UTC().Format(time.RFC3339))
	var out []Recording
	token := ""
	for {
		q := url.Values{}
		q.Set("filter", filter)
		q.Set("pageSize", "100")
		if token != "" {
			q.Set("pageToken", token)
		}
		var resp struct {
			ConferenceRecords []struct {
				Name      string    `json:"name"`
				StartTime time.Time `json:"startTime"`
				Space     string    `json:"space"`
			} `json:"conferenceRecords"`
			NextPageToken string `json:"nextPageToken"`
		}
		if err := getJSON(ctx, hc, g.apiBase+"/conferenceRecords?"+q.Encode(), &resp); err != nil {
			return nil, err
		}
		for _, cr := range resp.ConferenceRecords {
			recs, err := g.transcripts(ctx, hc, cr.Name, cr.Space, cr.StartTime)
			if err != nil {
				return nil, err
			}
			out = append(out, recs...)
		}
		if resp.NextPageToken == "" {
			return out, nil
		}
		token = resp.NextPageToken
	}
}

// transcripts lists the ready transcripts of one conference record.
func (g *googleMeet) transcripts(ctx context.Context, hc *http.Client, record, space string, started time.Time) ([]Recording, error) {
	var out []Recording
	title := ""
	token := ""
	for {
		q := url.Values{"pageSize": {"100"}}
		if token != "" {
			q.Set("pageToken", token)
		}
		var resp struct {
			Transcripts []struct {
				Name  string `json:"name"`
				State string `json:"state"`
			} `json:"transcripts"`
			NextPageToken string `json:"nextPageToken"`
		}
		if err := getJSON(ctx, hc, g.apiBase+"/"+record+"/transcripts?"+q.Encode(), &resp); err != nil {
			return nil, err
		}
		for _, t := range resp.Transcripts {
			if t.State != "FILE_GENERATED" {
				continue
			}
			if title == "" {
				title = g.title(ctx, hc, space, started)
			}
			s := started
			out = append(out, Recording{ExternalID: t.Name, MeetingID: record, Title: title, StartedAt: &s})
		}
		if resp.NextPageToken == "" {
			return out, nil
		}
		token = resp.NextPageToken
	}
}

// title builds "Google Meet abc-defg-hij" from the space: the Meet API has no meeting title.
func (g *googleMeet) title(ctx context.Context, hc *http.Client, space string, started time.Time) string {
	var sp struct {
		MeetingCode string `json:"meetingCode"`
	}
	if space != "" {
		_ = getJSON(ctx, hc, g.apiBase+"/"+space, &sp)
	}
	if sp.MeetingCode != "" {
		return "Google Meet " + sp.MeetingCode
	}
	return "Google Meet " + started.Format("2006-01-02 15:04")
}

func (g *googleMeet) Transcript(ctx context.Context, hc *http.Client, _ Account, rec Recording) (string, error) {
	names, err := g.participantNames(ctx, hc, rec.MeetingID)
	if err != nil {
		return "", err
	}
	var b strings.Builder
	lastSpeaker := ""
	token := ""
	for {
		q := url.Values{"pageSize": {"100"}}
		if token != "" {
			q.Set("pageToken", token)
		}
		var resp struct {
			TranscriptEntries []struct {
				Participant string `json:"participant"`
				Text        string `json:"text"`
			} `json:"transcriptEntries"`
			NextPageToken string `json:"nextPageToken"`
		}
		if err := getJSON(ctx, hc, g.apiBase+"/"+rec.ExternalID+"/entries?"+q.Encode(), &resp); err != nil {
			return "", err
		}
		for _, e := range resp.TranscriptEntries {
			text := strings.TrimSpace(e.Text)
			if text == "" {
				continue
			}
			speaker := names[e.Participant]
			if speaker == lastSpeaker && b.Len() > 0 {
				b.WriteString(" ")
				b.WriteString(text)
				continue
			}
			if b.Len() > 0 {
				b.WriteString("\n\n")
			}
			if speaker != "" {
				b.WriteString("**" + speaker + "** : ")
			}
			b.WriteString(text)
			lastSpeaker = speaker
		}
		if resp.NextPageToken == "" {
			return b.String(), nil
		}
		token = resp.NextPageToken
	}
}

// participantNames maps participant resource names to display names for one conference.
func (g *googleMeet) participantNames(ctx context.Context, hc *http.Client, record string) (map[string]string, error) {
	names := map[string]string{}
	token := ""
	for {
		q := url.Values{"pageSize": {"250"}}
		if token != "" {
			q.Set("pageToken", token)
		}
		type user struct {
			DisplayName string `json:"displayName"`
		}
		var resp struct {
			Participants []struct {
				Name          string `json:"name"`
				SignedinUser  *user  `json:"signedinUser"`
				AnonymousUser *user  `json:"anonymousUser"`
				PhoneUser     *user  `json:"phoneUser"`
			} `json:"participants"`
			NextPageToken string `json:"nextPageToken"`
		}
		if err := getJSON(ctx, hc, g.apiBase+"/"+record+"/participants?"+q.Encode(), &resp); err != nil {
			return nil, err
		}
		for _, p := range resp.Participants {
			for _, u := range []*user{p.SignedinUser, p.AnonymousUser, p.PhoneUser} {
				if u != nil && u.DisplayName != "" {
					names[p.Name] = u.DisplayName
					break
				}
			}
		}
		if resp.NextPageToken == "" {
			return names, nil
		}
		token = resp.NextPageToken
	}
}
