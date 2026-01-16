package email

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"html/template"
	"log/slog"
	"net/smtp"
	"os"
	"strings"
)

// Config holds email service configuration
type Config struct {
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	FromAddress  string
	FromName     string
	UseTLS       bool
	Enabled      bool
}

// LoadConfig loads email configuration from environment
func LoadConfig() *Config {
	return &Config{
		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		FromAddress:  getEnv("SMTP_FROM_ADDRESS", "noreply@cloudplatform.local"),
		FromName:     getEnv("SMTP_FROM_NAME", "Cloud Platform"),
		UseTLS:       getEnv("SMTP_USE_TLS", "true") == "true",
		Enabled:      getEnv("SMTP_HOST", "") != "",
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Service handles email sending
type Service struct {
	cfg *Config
	log *slog.Logger
}

// NewService creates a new email service
func NewService(cfg *Config) *Service {
	return &Service{
		cfg: cfg,
		log: slog.New(slog.NewJSONHandler(os.Stdout, nil)),
	}
}

// Email represents an email message
type Email struct {
	To          []string
	Subject     string
	Body        string
	HTMLBody    string
	Attachments []Attachment
}

// Attachment represents an email attachment
type Attachment struct {
	Filename string
	Content  []byte
	MIMEType string
}

// Send sends an email
func (s *Service) Send(ctx context.Context, email Email) error {
	if !s.cfg.Enabled {
		s.log.Warn("email service not configured, skipping send",
			"to", email.To,
			"subject", email.Subject,
		)
		return nil
	}

	from := fmt.Sprintf("%s <%s>", s.cfg.FromName, s.cfg.FromAddress)

	// Build message
	var msg bytes.Buffer
	msg.WriteString(fmt.Sprintf("From: %s\r\n", from))
	msg.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(email.To, ", ")))
	msg.WriteString(fmt.Sprintf("Subject: %s\r\n", email.Subject))
	msg.WriteString("MIME-Version: 1.0\r\n")

	if email.HTMLBody != "" {
		msg.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
		msg.WriteString("\r\n")
		msg.WriteString(email.HTMLBody)
	} else {
		msg.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
		msg.WriteString("\r\n")
		msg.WriteString(email.Body)
	}

	// Connect to SMTP server
	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)

	var auth smtp.Auth
	if s.cfg.SMTPUser != "" {
		auth = smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)
	}

	if s.cfg.UseTLS {
		return s.sendWithTLS(addr, auth, s.cfg.FromAddress, email.To, msg.Bytes())
	}

	return smtp.SendMail(addr, auth, s.cfg.FromAddress, email.To, msg.Bytes())
}

// sendWithTLS sends email with TLS
func (s *Service) sendWithTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         s.cfg.SMTPHost,
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("TLS dial failed: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, s.cfg.SMTPHost)
	if err != nil {
		return fmt.Errorf("SMTP client creation failed: %w", err)
	}
	defer client.Close()

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP auth failed: %w", err)
		}
	}

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("SMTP MAIL failed: %w", err)
	}

	for _, addr := range to {
		if err := client.Rcpt(addr); err != nil {
			return fmt.Errorf("SMTP RCPT failed: %w", err)
		}
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("SMTP DATA failed: %w", err)
	}

	_, err = w.Write(msg)
	if err != nil {
		return fmt.Errorf("SMTP write failed: %w", err)
	}

	err = w.Close()
	if err != nil {
		return fmt.Errorf("SMTP close failed: %w", err)
	}

	return client.Quit()
}

// Template email methods

// SendInvitation sends a user invitation email
func (s *Service) SendInvitation(ctx context.Context, toEmail, toName, inviterName, orgName, inviteLink string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Cloud Platform Invitation</h1>
        </div>
        <div class="content">
            <p>Hi {{.ToName}},</p>
            <p>{{.InviterName}} has invited you to join <strong>{{.OrgName}}</strong> on Cloud Platform.</p>
            <p>Click the button below to accept your invitation and create your account:</p>
            <p style="text-align: center;">
                <a href="{{.InviteLink}}" class="button">Accept Invitation</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">{{.InviteLink}}</p>
            <p>This invitation will expire in 7 days.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 Cloud Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`

	t, err := template.New("invitation").Parse(tmpl)
	if err != nil {
		return err
	}

	var body bytes.Buffer
	err = t.Execute(&body, map[string]string{
		"ToName":      toName,
		"InviterName": inviterName,
		"OrgName":     orgName,
		"InviteLink":  inviteLink,
	})
	if err != nil {
		return err
	}

	return s.Send(ctx, Email{
		To:       []string{toEmail},
		Subject:  fmt.Sprintf("You've been invited to join %s on Cloud Platform", orgName),
		HTMLBody: body.String(),
	})
}

// SendPasswordReset sends a password reset email
func (s *Service) SendPasswordReset(ctx context.Context, toEmail, toName, resetLink string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hi {{.ToName}},</p>
            <p>We received a request to reset your password for your Cloud Platform account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
                <a href="{{.ResetLink}}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">{{.ResetLink}}</p>
            <div class="warning">
                <strong>Note:</strong> This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </div>
        </div>
        <div class="footer">
            <p>&copy; 2026 Cloud Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`

	t, err := template.New("reset").Parse(tmpl)
	if err != nil {
		return err
	}

	var body bytes.Buffer
	err = t.Execute(&body, map[string]string{
		"ToName":    toName,
		"ResetLink": resetLink,
	})
	if err != nil {
		return err
	}

	return s.Send(ctx, Email{
		To:       []string{toEmail},
		Subject:  "Reset your Cloud Platform password",
		HTMLBody: body.String(),
	})
}

// SendWelcome sends a welcome email to new users
func (s *Service) SendWelcome(ctx context.Context, toEmail, toName, orgName string) error {
	tmpl := `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .feature { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Cloud Platform!</h1>
        </div>
        <div class="content">
            <p>Hi {{.ToName}},</p>
            <p>Welcome to Cloud Platform! Your account for <strong>{{.OrgName}}</strong> is now ready.</p>
            <p>Here's what you can do:</p>
            <div class="feature">
                <strong>Virtual Machines</strong> - Deploy and manage VMs with ease
            </div>
            <div class="feature">
                <strong>Networking</strong> - Create VPCs, subnets, and security groups
            </div>
            <div class="feature">
                <strong>Storage</strong> - Manage block and object storage
            </div>
            <div class="feature">
                <strong>Monitoring</strong> - Track your infrastructure health
            </div>
            <p style="text-align: center;">
                <a href="https://cloudplatform.example.com/dashboard" class="button">Go to Dashboard</a>
            </p>
            <p>Need help? Check out our <a href="https://docs.cloudplatform.example.com">documentation</a> or contact support.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 Cloud Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`

	t, err := template.New("welcome").Parse(tmpl)
	if err != nil {
		return err
	}

	var body bytes.Buffer
	err = t.Execute(&body, map[string]string{
		"ToName":  toName,
		"OrgName": orgName,
	})
	if err != nil {
		return err
	}

	return s.Send(ctx, Email{
		To:       []string{toEmail},
		Subject:  "Welcome to Cloud Platform!",
		HTMLBody: body.String(),
	})
}

// SendVMStatusNotification sends a VM status change notification
func (s *Service) SendVMStatusNotification(ctx context.Context, toEmail, vmName, status, projectName string) error {
	var statusColor, statusText string
	switch status {
	case "running":
		statusColor = "#22c55e"
		statusText = "is now running"
	case "stopped":
		statusColor = "#6b7280"
		statusText = "has been stopped"
	case "error":
		statusColor = "#ef4444"
		statusText = "encountered an error"
	default:
		statusColor = "#3b82f6"
		statusText = "status changed to " + status
	}

	tmpl := `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: {{.StatusColor}}; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .vm-info { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>VM Status Update</h1>
        </div>
        <div class="content">
            <p>Your virtual machine <strong>{{.VMName}}</strong> {{.StatusText}}.</p>
            <div class="vm-info">
                <p><strong>VM Name:</strong> {{.VMName}}</p>
                <p><strong>Project:</strong> {{.ProjectName}}</p>
                <p><strong>Status:</strong> {{.Status}}</p>
            </div>
            <p>View your VM in the <a href="https://cloudplatform.example.com/dashboard/compute/vms">dashboard</a>.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 Cloud Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`

	t, err := template.New("vm-status").Parse(tmpl)
	if err != nil {
		return err
	}

	var body bytes.Buffer
	err = t.Execute(&body, map[string]string{
		"VMName":      vmName,
		"Status":      status,
		"StatusText":  statusText,
		"StatusColor": statusColor,
		"ProjectName": projectName,
	})
	if err != nil {
		return err
	}

	return s.Send(ctx, Email{
		To:       []string{toEmail},
		Subject:  fmt.Sprintf("VM %s %s", vmName, statusText),
		HTMLBody: body.String(),
	})
}
