import express from 'express'
import nodemailer from 'nodemailer'

const app = express()
app.use(express.json())
const PORT = 3030

// Create a test transporter using Ethereal (fake SMTP for testing)
// In production, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars
let transporter: nodemailer.Transporter | null = null

async function getTransporter() {
  if (transporter) return transporter
  
  if (process.env.SMTP_HOST) {
    // Production SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } else {
    // Test mode — use Ethereal (generates a temporary test account)
    const testAccount = await nodemailer.createTestAccount()
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
    console.log('📧 Using Ethereal test email account:', testAccount.user)
  }
  
  return transporter
}

app.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body
    if (!to || !subject) {
      return res.status(400).json({ error: 'to and subject are required' })
    }

    const t = await getTransporter()
    const info = await t.sendMail({
      from: process.env.SMTP_USER || 'vsbec.placement@ethereal.email',
      to,
      subject,
      html: html || text,
      text: text || undefined,
    })

    console.log(`📧 Email sent to ${to}: ${info.messageId}`)
    // If using Ethereal, include the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info)
    res.json({ 
      success: true, 
      messageId: info.messageId,
      previewUrl: previewUrl ? String(previewUrl) : undefined,
    })
  } catch (error: any) {
    console.error('Email send error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-service' })
})

app.listen(PORT, () => {
  console.log(`📧 Email service running on port ${PORT}`)
})
