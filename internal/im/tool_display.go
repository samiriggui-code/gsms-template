package im

import (
	"encoding/json"
	"fmt"
	"strings"
)

// IMToolStep tracks one tool invocation for IM display (mirrors Web agent stream events).
type IMToolStep struct {
	ToolCallID string
	ToolName   string
	Pending    bool
	Success    bool
	Arguments  map[string]any
	Data       map[string]interface{}
	Output     string
}

// imLocalizedToolName returns zh-CN labels aligned with frontend agentStream.tools.
func imLocalizedToolName(toolName string) string {
	if name, ok := imToolNameLabels[toolName]; ok {
		return name
	}
	if strings.HasPrefix(toolName, "mcp_") {
		return formatMCPToolName(toolName)
	}
	return toolName
}

var imToolNameLabels = map[string]string{
	"search_knowledge":        "Recherche dans la base de connaissances",
	"knowledge_search":        "Recherche dans la base de connaissances",
	"grep_chunks":             "Recherche par mots-clés",
	"read_document":           "Lire un document",
	"list_documents":          "Parcourir la liste des documents",
	"web_search":              "Recherche web",
	"web_fetch":               "Récupération de page web",
	"get_document_info":       "Obtenir les informations du document",
	"list_knowledge_chunks":   "Voir les fragments de connaissance",
	"get_related_documents":   "Trouver des documents liés",
	"get_document_content":    "Obtenir le contenu du document",
	"wiki_search":             "Recherche wiki",
	"wiki_read_page":          "Lecture wiki",
	"wiki_read_source_doc":    "Lecture attentive du document source",
	"todo_write":              "Gestion du plan",
	"ask_user":                "Poser une question à l'utilisateur",
	"knowledge_graph_extract": "Extraction du graphe de connaissances",
	"thinking":                "Réflexion",
	"image_analysis":          "Voir le contenu de l'image",
	"query_understand":        "Compréhension de la question",
	"query_knowledge_graph":   "Requête sur le graphe de connaissances",
	"read_skill":              "Lire une compétence",
	"execute_skill_script":    "Exécuter un script de compétence",
	"list_sandbox_files":      "Lister les fichiers du bac à sable",
	"read_sandbox_file":       "Lire un fichier du bac à sable",
	"write_sandbox_file":      "Écrire un fichier du bac à sable",
	"edit_sandbox_file":       "Modifier un fichier du bac à sable",
	"shell_exec":              "Exécuter une commande dans le bac à sable",
	"data_analysis":           "Analyse de données",
	"data_schema":             "Structure des données",
	"database_query":          "Requête en base de données",
}

func formatMCPToolName(rawName string) string {
	rest := strings.TrimPrefix(rawName, "mcp_")
	if rest == "" {
		return rawName
	}
	parts := strings.Split(rest, "_")
	for i, p := range parts {
		if p == "" {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	return strings.Join(parts, " ")
}

func collectQueryStrings(value any) []string {
	if value == nil {
		return nil
	}
	switch v := value.(type) {
	case string:
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			return nil
		}
		if strings.HasPrefix(trimmed, "[") {
			var parsed []any
			if err := json.Unmarshal([]byte(trimmed), &parsed); err == nil {
				var out []string
				for _, item := range parsed {
					if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
						out = append(out, strings.TrimSpace(s))
					}
				}
				return out
			}
		}
		return []string{trimmed}
	case []any:
		var out []string
		for _, item := range v {
			if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
				out = append(out, strings.TrimSpace(s))
			}
		}
		return out
	case []string:
		var out []string
		for _, s := range v {
			if strings.TrimSpace(s) != "" {
				out = append(out, strings.TrimSpace(s))
			}
		}
		return out
	default:
		return nil
	}
}

func imGetQueryText(args any) string {
	if args == nil {
		return ""
	}
	parsed := args
	if s, ok := args.(string); ok {
		var obj map[string]any
		if err := json.Unmarshal([]byte(s), &obj); err != nil {
			return ""
		}
		parsed = obj
	}
	record, ok := parsed.(map[string]any)
	if !ok {
		return ""
	}
	seen := make(map[string]struct{})
	var queries []string
	for _, q := range collectQueryStrings(record["query"]) {
		if _, dup := seen[q]; dup {
			continue
		}
		seen[q] = struct{}{}
		queries = append(queries, q)
	}
	for _, q := range collectQueryStrings(record["queries"]) {
		if _, dup := seen[q]; dup {
			continue
		}
		seen[q] = struct{}{}
		queries = append(queries, q)
	}
	return strings.Join(queries, ", ")
}

func imGetWikiPageText(args any) string {
	if args == nil {
		return ""
	}
	parsed := args
	if s, ok := args.(string); ok {
		var obj map[string]any
		if err := json.Unmarshal([]byte(s), &obj); err != nil {
			return ""
		}
		parsed = obj
	}
	record, ok := parsed.(map[string]any)
	if !ok {
		return ""
	}
	seen := make(map[string]struct{})
	var slugs []string
	for _, slug := range collectQueryStrings(record["slug"]) {
		if _, dup := seen[slug]; dup {
			continue
		}
		seen[slug] = struct{}{}
		slugs = append(slugs, slug)
	}
	for _, slug := range collectQueryStrings(record["slugs"]) {
		if _, dup := seen[slug]; dup {
			continue
		}
		seen[slug] = struct{}{}
		slugs = append(slugs, slug)
	}
	return strings.Join(slugs, "、")
}

func imGetGrepPatterns(args any) []string {
	if args == nil {
		return nil
	}
	record, ok := args.(map[string]any)
	if !ok {
		return nil
	}
	if queries := collectQueryStrings(record["queries"]); len(queries) > 0 {
		return queries
	}
	if patterns := collectQueryStrings(record["patterns"]); len(patterns) > 0 {
		return patterns
	}
	if q := imGetQueryText(record); q != "" {
		return []string{q}
	}
	if pattern, ok := record["pattern"].(string); ok && strings.TrimSpace(pattern) != "" {
		return []string{strings.TrimSpace(pattern)}
	}
	return nil
}

func imGetWebSearchQuery(step IMToolStep) string {
	if q := imGetQueryText(step.Arguments); q != "" {
		return q
	}
	return imGetQueryText(step.Data)
}

func imGetGrepPatternsFromStep(step IMToolStep) []string {
	if patterns := imGetGrepPatterns(step.Arguments); len(patterns) > 0 {
		return patterns
	}
	return imGetGrepPatterns(step.Data)
}

func imAppendQueryTitle(base, query string) string {
	if query == "" {
		return base
	}
	return fmt.Sprintf("%s : « %s »", base, query)
}

func imAppendPatternsTitle(base string, patterns []string) string {
	if len(patterns) == 0 {
		return base
	}
	display := patterns
	more := ""
	if len(patterns) > 2 {
		display = patterns[:2]
		more = fmt.Sprintf(" +%d", len(patterns)-2)
	}
	return fmt.Sprintf("%s : « %s%s »", base, strings.Join(display, ", "), more)
}

// FormatIMToolLine formats one agent tool step (no emoji; aligned with Web getToolTitle).
func FormatIMToolLine(step IMToolStep) string {
	title := imAgentToolTitle(step)
	if title == "" {
		return ""
	}
	if step.Pending {
		return title
	}
	if summary := imToolResultSummary(step); summary != "" {
		return title + " · " + summary
	}
	return title
}

// FormatIMRagPipelineLine formats quick-QA RAG pipeline steps (Web RagPipelineProgress).
func FormatIMRagPipelineLine(step IMToolStep) string {
	toolName := step.ToolName
	query := imGetQueryText(step.Arguments)
	if query == "" {
		query = imGetQueryText(step.Data)
	}

	switch toolName {
	case "query_understand":
		if step.Pending {
			return "Compréhension de la question..."
		}
		return "Compréhension de la question terminée"
	case "knowledge_search", "search_knowledge":
		source := imRetrievalSearchSource(step)
		if step.Pending {
			switch source {
			case imRetrievalSourceWeb:
				if query != "" {
					return fmt.Sprintf("Recherche sur le web : « %s »", query)
				}
				return "Recherche sur le web..."
			case imRetrievalSourceMixed:
				if query != "" {
					return fmt.Sprintf("Recherche dans la base de connaissances et sur le web : « %s »", query)
				}
				return "Recherche dans la base de connaissances et sur le web..."
			default:
				if query != "" {
					return fmt.Sprintf("Recherche dans la base de connaissances : « %s »", query)
				}
				return "Recherche dans la base de connaissances..."
			}
		}
		base := imRetrievalDoneTitle(source, step.Success)
		line := imAppendQueryTitle(base, query)
		if summary := imKnowledgeSearchSummary(step.Data); summary != "" {
			return line + " · " + summary
		}
		return line
	default:
		return ""
	}
}

func imSandboxMutationTitle(step IMToolStep, pending bool) string {
	name := imLocalizedToolName(step.ToolName)
	path := imSandboxFilePath(step)
	stat := imSandboxDiffStat(step)
	base := name
	if pending {
		base = name + "..."
	}
	if path != "" {
		base = imAppendQueryTitle(name, path)
		if pending {
			base += "..."
		}
	}
	if stat != "" {
		return base + " " + stat
	}
	return base
}

func imSandboxFilePath(step IMToolStep) string {
	if step.Data != nil {
		if p, ok := step.Data["path"].(string); ok && strings.TrimSpace(p) != "" {
			return strings.TrimSpace(p)
		}
	}
	if step.Arguments != nil {
		if p, ok := step.Arguments["path"].(string); ok && strings.TrimSpace(p) != "" {
			return strings.TrimSpace(p)
		}
	}
	return ""
}

func imSandboxDiffStat(step IMToolStep) string {
	added := imIntField(step.Arguments, "added_lines")
	removed := imIntField(step.Arguments, "removed_lines")
	if added == 0 && removed == 0 {
		added = imIntField(step.Data, "added_lines")
		removed = imIntField(step.Data, "removed_lines")
	}
	switch {
	case added > 0 && removed > 0:
		return fmt.Sprintf("+%d -%d", added, removed)
	case added > 0:
		return fmt.Sprintf("+%d", added)
	case removed > 0:
		return fmt.Sprintf("-%d", removed)
	default:
		return ""
	}
}

func imAgentToolTitle(step IMToolStep) string {
	if step.Pending {
		switch step.ToolName {
		case "image_analysis":
			return "Consultation du contenu de l'image..."
		case "wiki_search", "wiki_read_page":
			return imLocalizedToolName(step.ToolName) + "..."
		case "write_sandbox_file", "edit_sandbox_file":
			return imSandboxMutationTitle(step, true)
		default:
			return fmt.Sprintf("Appel de %s...", imLocalizedToolName(step.ToolName))
		}
	}

	toolName := step.ToolName
	isSearchTool := toolName == "search_knowledge" || toolName == "knowledge_search" || toolName == "wiki_search"
	if isSearchTool {
		base := imToolStatusDescription(step)
		query := imGetQueryText(step.Arguments)
		if query == "" {
			query = imGetQueryText(step.Data)
		}
		return imAppendQueryTitle(base, query)
	}

	if toolName == "web_search" {
		base := imToolStatusDescription(step)
		return imAppendQueryTitle(base, imGetWebSearchQuery(step))
	}

	if toolName == "grep_chunks" {
		base := imToolStatusDescription(step)
		return imAppendPatternsTitle(base, imGetGrepPatternsFromStep(step))
	}

	if toolName == "wiki_read_page" {
		pageLabel := ""
		if step.Data != nil {
			if title, ok := step.Data["title"].(string); ok {
				pageLabel = strings.TrimSpace(title)
			}
		}
		if pageLabel == "" {
			pageLabel = imGetWikiPageText(step.Arguments)
		}
		if pageLabel == "" {
			pageLabel = imGetWikiPageText(step.Data)
		}
		base := imToolStatusDescription(step)
		return imAppendQueryTitle(base, pageLabel)
	}

	if toolName == "write_sandbox_file" || toolName == "edit_sandbox_file" {
		return imSandboxMutationTitle(step, false)
	}

	if summary := imToolHeaderSummary(step); summary != "" {
		return summary
	}
	return imToolStatusDescription(step)
}

func imToolStatusDescription(step IMToolStep) string {
	success := step.Success
	toolName := step.ToolName

	switch toolName {
	case "search_knowledge", "knowledge_search":
		if success {
			return "Rechercher dans la base de connaissances"
		}
		return "Échec de la recherche dans la base de connaissances"
	case "wiki_search", "wiki_read_page":
		name := imLocalizedToolName(toolName)
		if success {
			return name
		}
		return fmt.Sprintf("Échec de l'appel de %s", name)
	case "web_search":
		if success {
			return "Recherche web"
		}
		return "Échec de la recherche web"
	case "grep_chunks":
		if success {
			return "Recherche par mots-clés"
		}
		return "Échec de la recherche par mots-clés"
	case "get_document_info":
		if success {
			return "Obtenir les informations du document"
		}
		return "Échec de la lecture des informations du document"
	case "get_document_content", "wiki_read_source_doc", "read_document":
		if success {
			return "Lire un document"
		}
		return "Échec de la lecture du document"
	case "list_documents":
		if success {
			return "Parcourir la liste des documents"
		}
		return "Échec du parcours de la liste des documents"
	case "thinking":
		if success {
			return "Réflexion terminée"
		}
		return "Échec de la réflexion"
	case "todo_write":
		if success {
			return "Mise à jour de la liste des tâches"
		}
		return "Échec de la mise à jour de la liste des tâches"
	case "image_analysis":
		if success {
			return "Contenu de l'image consulté"
		}
		return "Échec de la consultation de l'image"
	case "query_understand":
		if success {
			return "Compréhension de la question terminée"
		}
		return fmt.Sprintf("Échec de l'appel de %s", imLocalizedToolName(toolName))
	default:
		name := imLocalizedToolName(toolName)
		if success {
			return fmt.Sprintf("Appel de %s", name)
		}
		return fmt.Sprintf("Échec de l'appel de %s", name)
	}
}

func imToolHeaderSummary(step IMToolStep) string {
	if step.Pending || !step.Success {
		return ""
	}
	toolName := step.ToolName
	data := step.Data

	switch toolName {
	case "search_knowledge", "knowledge_search":
		return ""
	case "get_document_info":
		if data != nil {
			if title, ok := data["title"].(string); ok && strings.TrimSpace(title) != "" {
				return fmt.Sprintf("Lecture du document : %s", strings.TrimSpace(title))
			}
		}
	case "list_knowledge_chunks", "read_document":
		if data != nil {
			if question, ok := data["faq_question"].(string); ok && strings.TrimSpace(question) != "" {
				return fmt.Sprintf("Consultation de la FAQ : %s", strings.TrimSpace(question))
			}
			if _, ok := data["fetched_chunks"]; ok {
				title := "Document"
				if t, ok := data["knowledge_title"].(string); ok && strings.TrimSpace(t) != "" {
					title = strings.TrimSpace(t)
				} else if id, ok := data["knowledge_id"].(string); ok && strings.TrimSpace(id) != "" {
					title = strings.TrimSpace(id)
				}
				return fmt.Sprintf("Consultation de %s", title)
			}
		}
	}
	return ""
}

func imToolResultSummary(step IMToolStep) string {
	if step.Pending || !step.Success {
		return ""
	}
	switch step.ToolName {
	case "search_knowledge", "knowledge_search":
		return imKnowledgeSearchSummary(step.Data)
	case "web_search":
		return imWebSearchSummary(step.Data)
	case "grep_chunks":
		return imGrepSearchSummary(step.Data)
	case "list_knowledge_chunks", "read_document":
		return imKnowledgeChunksSummary(step.Data)
	case "list_documents":
		return imDocumentListSummary(step.Data)
	default:
		return briefToolSummary(step.Output)
	}
}

const (
	imRetrievalSourceKnowledge = "knowledge"
	imRetrievalSourceWeb       = "web"
	imRetrievalSourceMixed     = "mixed"
)

func imRetrievalSearchSource(step IMToolStep) string {
	if source := imSearchSourceFromData(step.Data); source != "" {
		return source
	}
	if step.Arguments != nil {
		if source, ok := step.Arguments["search_source"].(string); ok && source != "" {
			return source
		}
	}
	return imRetrievalSourceKnowledge
}

func imSearchSourceFromData(data map[string]interface{}) string {
	if data == nil {
		return ""
	}
	if source, ok := data["search_source"].(string); ok {
		return strings.TrimSpace(source)
	}
	return ""
}

func imRetrievalDoneTitle(source string, success bool) string {
	switch source {
	case imRetrievalSourceWeb:
		if success {
			return "Recherche web"
		}
		return "Échec de la recherche web"
	case imRetrievalSourceMixed:
		if success {
			return "Recherche dans la base de connaissances et sur le web"
		}
		return "Échec de la recherche"
	default:
		if success {
			return "Rechercher dans la base de connaissances"
		}
		return "Échec de la recherche dans la base de connaissances"
	}
}

func imIntField(data map[string]interface{}, key string) int {
	if data == nil {
		return 0
	}
	switch v := data[key].(type) {
	case int:
		return v
	case int64:
		return int(v)
	case float64:
		return int(v)
	default:
		return 0
	}
}

func imKnowledgeSearchSummary(data map[string]interface{}) string {
	if data == nil {
		return ""
	}
	count := imResultCount(data)
	if count == 0 {
		return "Aucun contenu correspondant trouvé"
	}
	source := imSearchSourceFromData(data)
	webCount := imIntField(data, "web_count")
	docCount := imIntField(data, "doc_count")
	if source == imRetrievalSourceWeb || (webCount > 0 && docCount == 0) {
		return fmt.Sprintf("%d page(s) web trouvée(s)", count)
	}
	if kbCounts, ok := data["kb_counts"].(map[string]interface{}); ok && len(kbCounts) > 0 {
		return fmt.Sprintf("%d résultat(s) trouvé(s) dans %d fichier(s)", count, len(kbCounts))
	}
	if source == imRetrievalSourceMixed && docCount > 0 && webCount > 0 {
		return fmt.Sprintf("%d résultat(s) trouvé(s) (%d document(s), %d page(s) web)", count, docCount, webCount)
	}
	return fmt.Sprintf("%d résultat(s) trouvé(s)", count)
}

func imWebSearchSummary(data map[string]interface{}) string {
	if data == nil {
		return ""
	}
	count := imResultCount(data)
	if count == 0 {
		return ""
	}
	return fmt.Sprintf("%d résultat(s) de recherche web trouvé(s)", count)
}

func imGrepSearchSummary(data map[string]interface{}) string {
	if data == nil {
		return ""
	}
	totalChunks := 0
	if v, ok := data["total_matches"].(float64); ok {
		totalChunks = int(v)
	} else if v, ok := data["total_matches"].(int); ok {
		totalChunks = v
	}
	if totalChunks == 0 {
		return "Aucun contenu correspondant trouvé"
	}
	docCount := imGrepDocumentCount(data)
	return fmt.Sprintf("%d extrait(s) correspondant(s) trouvé(s) dans %d document(s)", totalChunks, docCount)
}

func imGrepDocumentCount(data map[string]interface{}) int {
	if v, ok := data["document_count"].(float64); ok && v >= 0 {
		return int(v)
	}
	if v, ok := data["document_count"].(int); ok && v >= 0 {
		return v
	}
	if results, ok := data["knowledge_results"].([]interface{}); ok && len(results) > 0 {
		return len(results)
	}
	if results, ok := data["chunk_results"].([]interface{}); ok && len(results) > 0 {
		return len(results)
	}
	return 0
}

func imDocumentListSummary(data map[string]interface{}) string {
	if data == nil {
		return ""
	}
	total := imNumericValue(data["total_docs"])
	listed := 0
	if docs, ok := data["documents"].([]interface{}); ok {
		listed = len(docs)
	}
	if total == 0 && listed == 0 {
		return "Aucun document dans la base de connaissances"
	}
	return fmt.Sprintf("%d / %d document(s) listé(s)", listed, total)
}

func imKnowledgeChunksSummary(data map[string]interface{}) string {
	if data == nil {
		return ""
	}
	fetched, ok := data["fetched_chunks"]
	if !ok {
		return ""
	}
	fetchedN := imNumericValue(fetched)
	totalN := imNumericValue(data["total_chunks"])
	summary := fmt.Sprintf("%d / %v fragment(s) chargé(s)", fetchedN, formatIMOptionalInt(totalN, data["total_chunks"]))
	pageSize := imNumericValue(data["page_size"])
	if totalN > pageSize && pageSize > 0 {
		page := imNumericValue(data["page"])
		if page <= 0 {
			page = 1
		}
		summary += fmt.Sprintf(" · page %d, %d par page", page, pageSize)
	}
	return summary
}

func imResultCount(data map[string]interface{}) int {
	if results, ok := data["results"].([]interface{}); ok && len(results) > 0 {
		return len(results)
	}
	if count, ok := data["count"].(float64); ok && count > 0 {
		return int(count)
	}
	if count, ok := data["count"].(int); ok && count > 0 {
		return count
	}
	return 0
}

func imNumericValue(v any) int {
	switch n := v.(type) {
	case int:
		return n
	case int64:
		return int(n)
	case float64:
		return int(n)
	default:
		return 0
	}
}

func formatIMOptionalInt(n int, raw any) string {
	if raw == nil {
		return "?"
	}
	if _, ok := raw.(string); ok && n == 0 {
		return "?"
	}
	if n == 0 {
		return "?"
	}
	return fmt.Sprintf("%d", n)
}

func renderIMToolSteps(steps []IMToolStep, format func(IMToolStep) string) string {
	if len(steps) == 0 {
		return ""
	}
	var b strings.Builder
	for _, step := range steps {
		line := format(step)
		if line == "" {
			continue
		}
		b.WriteString(line)
		b.WriteByte('\n')
	}
	return strings.TrimRight(b.String(), "\n")
}

func mergeIMNarrativeAndTools(narrative string, toolLines string) string {
	narrative = strings.TrimSpace(narrative)
	toolLines = strings.TrimSpace(toolLines)
	switch {
	case narrative != "" && toolLines != "":
		return narrative + "\n" + toolLines
	case toolLines != "":
		return toolLines
	default:
		return narrative
	}
}

func upsertIMToolStep(steps *[]IMToolStep, index map[string]int, id string, update func(*IMToolStep)) {
	if i, ok := index[id]; ok {
		update(&(*steps)[i])
		return
	}
	step := IMToolStep{ToolCallID: id}
	update(&step)
	index[id] = len(*steps)
	*steps = append(*steps, step)
}
