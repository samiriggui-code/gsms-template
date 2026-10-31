package types

import (
	"strings"
	"time"
)

// PromptPlaceholder represents a placeholder that can be used in prompt templates
type PromptPlaceholder struct {
	// Name is the placeholder name (without braces), e.g., "query"
	Name string `json:"name"`
	// Label is a short label for the placeholder
	Label string `json:"label"`
	// Description explains what this placeholder represents
	Description string `json:"description"`
}

// PromptFieldType represents the type of prompt field
type PromptFieldType string

const (
	// PromptFieldSystemPrompt is for system prompts (normal mode)
	PromptFieldSystemPrompt PromptFieldType = "system_prompt"
	// PromptFieldAgentSystemPrompt is for agent mode system prompts
	PromptFieldAgentSystemPrompt PromptFieldType = "agent_system_prompt"
	// PromptFieldContextTemplate is for context templates
	PromptFieldContextTemplate PromptFieldType = "context_template"
	// PromptFieldRewriteSystemPrompt is for rewrite system prompts
	PromptFieldRewriteSystemPrompt PromptFieldType = "rewrite_system_prompt"
	// PromptFieldRewritePrompt is for rewrite user prompts
	PromptFieldRewritePrompt PromptFieldType = "rewrite_prompt"
	// PromptFieldFallbackPrompt is for fallback prompts
	PromptFieldFallbackPrompt PromptFieldType = "fallback_prompt"
)

// All available placeholders in the system
var (
	// Common placeholders
	PlaceholderQuery = PromptPlaceholder{
		Name:        "query",
		Label:       "Question de l'utilisateur",
		Description: "Question ou requête actuelle de l'utilisateur",
	}

	PlaceholderContexts = PromptPlaceholder{
		Name:        "contexts",
		Label:       "Contenu trouvé",
		Description: "Liste des contenus pertinents trouvés dans la base de connaissances",
	}

	PlaceholderCurrentTime = PromptPlaceholder{
		Name:        "current_time",
		Label:       "Date du jour",
		Description: "Date du jour (format ISO : 2006-01-02). Date seule, sans l'heure, pour ne pas casser le cache de préfixe du fournisseur à chaque seconde.",
	}

	PlaceholderCurrentWeek = PromptPlaceholder{
		Name:        "current_week",
		Label:       "Jour de la semaine",
		Description: "Jour de la semaine actuel (par exemple : lundi, Monday)",
	}

	// Rewrite prompt placeholders
	PlaceholderConversation = PromptPlaceholder{
		Name:        "conversation",
		Label:       "Historique de la conversation",
		Description: "Historique de la conversation mis en forme, utilisé pour reformuler les questions sur plusieurs tours",
	}

	PlaceholderYesterday = PromptPlaceholder{
		Name:        "yesterday",
		Label:       "Date d'hier",
		Description: "Date d'hier (format : 2006-01-02)",
	}

	PlaceholderAnswer = PromptPlaceholder{
		Name:        "answer",
		Label:       "Réponse de l'assistant",
		Description: "Contenu de la réponse de l'assistant (pour mettre en forme l'historique)",
	}

	// Agent mode specific placeholders
	PlaceholderKnowledgeBases = PromptPlaceholder{
		Name:        "knowledge_bases",
		Label:       "Liste des bases de connaissances",
		Description: "Liste des bases de connaissances mise en forme automatiquement, avec nom, description, nombre de documents, etc.",
	}

	PlaceholderWebSearchStatus = PromptPlaceholder{
		Name:        "web_search_status",
		Label:       "État de la recherche web",
		Description: "Indique si l'outil de recherche web est activé (Enabled ou Disabled)",
	}

	PlaceholderLanguage = PromptPlaceholder{
		Name:        "language",
		Label:       "Langue de l'utilisateur",
		Description: "Langue préférée de l'interface, par exemple French, English, etc., utilisée pour choisir la langue des réponses du LLM",
	}
)

// PlaceholdersByField returns the available placeholders for a specific prompt field type
func PlaceholdersByField(fieldType PromptFieldType) []PromptPlaceholder {
	switch fieldType {
	case PromptFieldSystemPrompt:
		// Normal mode system prompt
		return []PromptPlaceholder{
			PlaceholderQuery,
			PlaceholderContexts,
			PlaceholderCurrentTime,
			PlaceholderCurrentWeek,
			PlaceholderLanguage,
		}
	case PromptFieldAgentSystemPrompt:
		// Agent mode system prompt
		return []PromptPlaceholder{
			PlaceholderKnowledgeBases,
			PlaceholderWebSearchStatus,
			PlaceholderCurrentTime,
			PlaceholderLanguage,
		}
	case PromptFieldContextTemplate:
		return []PromptPlaceholder{
			PlaceholderQuery,
			PlaceholderContexts,
			PlaceholderCurrentTime,
			PlaceholderCurrentWeek,
			PlaceholderLanguage,
		}
	case PromptFieldRewriteSystemPrompt:
		// Rewrite system prompt supports same placeholders as rewrite user prompt
		return []PromptPlaceholder{
			PlaceholderQuery,
			PlaceholderConversation,
			PlaceholderCurrentTime,
			PlaceholderYesterday,
			PlaceholderLanguage,
		}
	case PromptFieldRewritePrompt:
		return []PromptPlaceholder{
			PlaceholderQuery,
			PlaceholderConversation,
			PlaceholderCurrentTime,
			PlaceholderYesterday,
			PlaceholderLanguage,
		}
	case PromptFieldFallbackPrompt:
		return []PromptPlaceholder{
			PlaceholderQuery,
			PlaceholderLanguage,
		}
	default:
		return []PromptPlaceholder{}
	}
}

// AllPlaceholders returns all available placeholders in the system
func AllPlaceholders() []PromptPlaceholder {
	return []PromptPlaceholder{
		PlaceholderQuery,
		PlaceholderContexts,
		PlaceholderCurrentTime,
		PlaceholderCurrentWeek,
		PlaceholderConversation,
		PlaceholderYesterday,
		PlaceholderAnswer,
		PlaceholderKnowledgeBases,
		PlaceholderWebSearchStatus,
		PlaceholderLanguage,
	}
}

// PlaceholderMap returns a map of field types to their available placeholders
func PlaceholderMap() map[PromptFieldType][]PromptPlaceholder {
	return map[PromptFieldType][]PromptPlaceholder{
		PromptFieldSystemPrompt:        PlaceholdersByField(PromptFieldSystemPrompt),
		PromptFieldAgentSystemPrompt:   PlaceholdersByField(PromptFieldAgentSystemPrompt),
		PromptFieldContextTemplate:     PlaceholdersByField(PromptFieldContextTemplate),
		PromptFieldRewriteSystemPrompt: PlaceholdersByField(PromptFieldRewriteSystemPrompt),
		PromptFieldRewritePrompt:       PlaceholdersByField(PromptFieldRewritePrompt),
		PromptFieldFallbackPrompt:      PlaceholdersByField(PromptFieldFallbackPrompt),
	}
}

// ---------------------------------------------------------------------------
// Unified prompt placeholder rendering
// ---------------------------------------------------------------------------

// PlaceholderValues is a map of placeholder names (without braces) to their
// replacement values. Example: {"query": "How to use?", "language": "English"}
type PlaceholderValues map[string]string

// RenderPromptPlaceholders replaces all {{key}} occurrences in template with
// the corresponding values from vals. Unknown placeholders are left untouched.
//
// Built-in auto-values (filled when not supplied explicitly):
//   - {{current_time}} -> time.Now().Format("2006-01-02") (date only; clock
//     precision would bust provider prefix caches on every request)
//   - {{current_week}} -> current weekday name
//   - {{yesterday}}    -> yesterday's date (2006-01-02)
func RenderPromptPlaceholders(template string, vals PlaceholderValues) string {
	if template == "" {
		return ""
	}

	// Populate auto-generated values when callers don't supply them.
	autoFill := func(key, value string) {
		if _, exists := vals[key]; !exists {
			if strings.Contains(template, "{{"+key+"}}") {
				vals[key] = value
			}
		}
	}

	now := time.Now()
	autoFill("current_time", now.Format("2006-01-02"))
	autoFill("current_week", now.Weekday().String())
	autoFill("yesterday", now.AddDate(0, 0, -1).Format("2006-01-02"))

	result := template
	for key, value := range vals {
		placeholder := "{{" + key + "}}"
		if strings.Contains(result, placeholder) {
			result = strings.ReplaceAll(result, placeholder, value)
		}
	}
	return result
}
