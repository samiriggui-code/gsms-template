package im

import "context"

// ClearCommand implements /clear.
// It soft-deletes the current ChannelSession and clears the LLM context so
// the next message starts a completely fresh conversation.
type ClearCommand struct{}

func newClearCommand() *ClearCommand { return &ClearCommand{} }

func (c *ClearCommand) Name() string { return "clear" }
func (c *ClearCommand) Description() string {
	return "Efface la mémoire de la conversation ; le prochain message ouvrira une nouvelle conversation"
}

func (c *ClearCommand) Execute(_ context.Context, _ *CommandContext, _ []string) (*CommandResult, error) {
	return &CommandResult{
		Content: "✅ Conversation effacée ; le prochain message ouvrira une nouvelle conversation.",
		Action:  ActionClear,
	}, nil
}
