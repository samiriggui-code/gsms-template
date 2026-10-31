package im

import "context"

// StopCommand implements /stop.
// It cancels the in-flight QA request for the current user+chat, allowing the
// user to abort a long-running ReAct reasoning chain without waiting for it to
// complete. If no request is in progress the command simply acknowledges.
type StopCommand struct{}

func newStopCommand() *StopCommand { return &StopCommand{} }

// Name returns the command keyword.
func (c *StopCommand) Name() string { return "stop" }

// Description returns the help text shown for the command.
func (c *StopCommand) Description() string { return "Interrompt la réponse en cours" }

func (c *StopCommand) Execute(_ context.Context, _ *CommandContext, _ []string) (*CommandResult, error) {
	return &CommandResult{
		Content: "✅ Interruption de la réponse en cours demandée.",
		Action:  ActionStop,
	}, nil
}
