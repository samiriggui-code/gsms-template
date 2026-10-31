package meetings

import (
	"bufio"
	"regexp"
	"strings"
)

var (
	// Teams writes speakers as voice tags: <v Alice Martin>Bonjour</v>.
	voiceTag = regexp.MustCompile(`^<v\s+([^>]+)>(.*?)(?:</v>)?$`)
	cueTime  = regexp.MustCompile(`-->`)
	anyTag   = regexp.MustCompile(`</?[^>]+>`)
)

// vttToMarkdown turns a WebVTT transcript into Markdown paragraphs, merging
// consecutive cues of the same speaker. It understands Teams voice tags and
// Zoom's "Speaker: text" cue lines.
func vttToMarkdown(vtt string) string {
	type turn struct{ speaker, text string }
	var turns []turn
	add := func(speaker, text string) {
		text = strings.TrimSpace(anyTag.ReplaceAllString(text, ""))
		if text == "" {
			return
		}
		if n := len(turns); n > 0 && turns[n-1].speaker == speaker {
			turns[n-1].text += " " + text
			return
		}
		turns = append(turns, turn{speaker, text})
	}

	sc := bufio.NewScanner(strings.NewReader(strings.ReplaceAll(vtt, "\r\n", "\n")))
	sc.Buffer(make([]byte, 64*1024), 4*1024*1024)
	inCue := false
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		switch {
		case line == "":
			inCue = false
		case cueTime.MatchString(line):
			inCue = true
		case !inCue:
			// WEBVTT header, NOTE blocks and cue identifiers.
		default:
			if m := voiceTag.FindStringSubmatch(line); m != nil {
				add(strings.TrimSpace(m[1]), m[2])
			} else if speaker, text, ok := zoomSpeaker(line); ok {
				add(speaker, text)
			} else {
				add("", line)
			}
		}
	}

	var b strings.Builder
	for _, t := range turns {
		if t.speaker != "" {
			b.WriteString("**")
			b.WriteString(t.speaker)
			b.WriteString("** : ")
		}
		b.WriteString(t.text)
		b.WriteString("\n\n")
	}
	return strings.TrimSpace(b.String())
}

// zoomSpeaker splits a Zoom cue line "Alice Martin: Bonjour" into speaker and text.
func zoomSpeaker(line string) (string, string, bool) {
	i := strings.Index(line, ": ")
	if i <= 0 || i > 60 {
		return "", "", false
	}
	speaker := line[:i]
	if strings.ContainsAny(speaker, ".?!") {
		return "", "", false
	}
	return speaker, line[i+2:], true
}
