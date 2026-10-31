package im

import (
	"context"
	"fmt"
	"strings"

	"github.com/Tencent/WeKnora/internal/types/interfaces"
)

// InfoCommand implements /info.
// It shows the bound agent's profile and capabilities so IM users can
// understand what the bot can do without leaving the chat.
type InfoCommand struct {
	kbService interfaces.KnowledgeBaseService
}

func newInfoCommand(kbService interfaces.KnowledgeBaseService) *InfoCommand {
	return &InfoCommand{kbService: kbService}
}

func (c *InfoCommand) Name() string { return "info" }
func (c *InfoCommand) Description() string {
	return "Affiche les informations et capacités de l'agent actuel"
}

func (c *InfoCommand) Execute(ctx context.Context, cmdCtx *CommandContext, _ []string) (*CommandResult, error) {
	var sb strings.Builder

	// Note: Feishu card markdown only renders **bold** when it occupies the
	// entire inline segment. "**label：**value" on the same line will show
	// raw asterisks. Always keep bold text self-contained on its own line.

	// ── Header ──
	name := cmdCtx.AgentName
	if name == "" {
		name = "Agent sans nom"
	}
	sb.WriteString(fmt.Sprintf("🤖 **%s**\n", name))
	if cmdCtx.CustomAgent != nil && cmdCtx.CustomAgent.Description != "" {
		sb.WriteString(fmt.Sprintf("> %s\n", cmdCtx.CustomAgent.Description))
	}

	if cmdCtx.CustomAgent == nil {
		sb.WriteString("\nAucun agent associé ; envoyez `/help` pour voir les commandes disponibles.")
		return &CommandResult{Content: sb.String()}, nil
	}

	cfg := cmdCtx.CustomAgent.Config

	// ── Mode ──
	if cmdCtx.CustomAgent.IsAgentMode() {
		sb.WriteString("\n🧠 **Mode Agent**\n")
		sb.WriteString("Raisonnement en plusieurs étapes et appels d'outils (ReAct)\n")
	} else {
		sb.WriteString("\n🧠 **Mode Agent**\n")
		sb.WriteString("Répond directement à partir de la recherche dans la base de connaissances (RAG)\n")
	}

	// ── Knowledge bases ──
	// KBSelectionMode: "all" uses every KB under the tenant (IDs list is empty),
	// "selected" uses the explicit KnowledgeBases list, "none"/empty means disabled.
	sb.WriteString("\n📚 **Bases de connaissances**\n")
	if cfg.KBSelectionMode == "all" {
		kbs, err := c.kbService.ListKnowledgeBasesByTenantID(ctx, cmdCtx.TenantID)
		if err == nil && len(kbs) > 0 {
			for _, kb := range kbs {
				sb.WriteString(fmt.Sprintf("  · %s\n", kb.Name))
			}
			sb.WriteString(fmt.Sprintf("  %d au total (toutes activées)\n", len(kbs)))
		} else {
			sb.WriteString("  Toutes activées\n")
		}
	} else if len(cfg.KnowledgeBases) > 0 {
		kbs, err := c.kbService.ListKnowledgeBasesByTenantID(ctx, cmdCtx.TenantID)
		if err == nil {
			nameMap := make(map[string]string, len(kbs))
			for _, kb := range kbs {
				nameMap[kb.ID] = kb.Name
			}
			for _, id := range cfg.KnowledgeBases {
				label := id
				if n, ok := nameMap[id]; ok {
					label = n
				}
				sb.WriteString(fmt.Sprintf("  · %s\n", label))
			}
		} else {
			sb.WriteString(fmt.Sprintf("  %d sélectionnée(s)\n", len(cfg.KnowledgeBases)))
		}
	} else {
		sb.WriteString("  Non configuré\n")
	}

	// ── Skills ──
	sb.WriteString("\n⚡ **Skills**\n")
	if cfg.SkillsSelectionMode == "all" {
		sb.WriteString("  Toutes activées\n")
	} else if cfg.SkillsSelectionMode == "selected" && len(cfg.SelectedSkills) > 0 {
		for _, s := range cfg.SelectedSkills {
			sb.WriteString(fmt.Sprintf("  · %s\n", s))
		}
	} else {
		sb.WriteString("  Non configuré\n")
	}

	// ── MCP ──
	sb.WriteString("\n🔌 **Services MCP**\n")
	if cfg.MCPSelectionMode == "all" {
		sb.WriteString("  Tous connectés\n")
	} else if cfg.MCPSelectionMode == "selected" && len(cfg.MCPServices) > 0 {
		sb.WriteString(fmt.Sprintf("  %d service(s) connecté(s)\n", len(cfg.MCPServices)))
	} else {
		sb.WriteString("  Non configuré\n")
	}

	// ── Web search ──
	sb.WriteString("\n🌐 **Recherche web**\n")
	if cfg.WebSearchEnabled {
		sb.WriteString("  Activée\n")
	} else {
		sb.WriteString("  Désactivée\n")
	}

	// ── Footer ──
	outputLabel := "Sortie en continu"
	if cmdCtx.ChannelOutputMode == "full" {
		outputLabel = "Sortie complète"
	}
	sb.WriteString(fmt.Sprintf("\n⚙️ **Mode de sortie**\n  %s\n", outputLabel))
	sb.WriteString("\n---\nEnvoyez `/help` pour voir toutes les commandes disponibles")

	return &CommandResult{Content: sb.String()}, nil
}
