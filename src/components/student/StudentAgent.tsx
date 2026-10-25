'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bot, X, Send, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_QUESTIONS = [
  'How do I register?',
  'How do I apply for a drive?',
  'What are the eligibility criteria?',
  'How do I update my profile?',
  'How do rounds work?',
]

const KNOWLEDGE_BASE: Record<string, string> = {
  register: 'To register on the VSBEC Placement Portal:\n1. Click "Get Started as Student" on the landing page\n2. Fill in the 4-step registration wizard:\n   - Step 1: Personal details (name, register number, email, mobile, DOB, gender, department + department password)\n   - Step 2: Academic details (year, section, semester, batch, CGPA, 10th %, 12th %)\n   - Step 3: Placement preferences (preferred role, domain, location, LinkedIn, resume URL)\n   - Step 4: Skills (select your skills and strong skills)\n3. After registration, login with your register number and department password',
  apply: 'To apply for a placement drive:\n1. Go to "Companies & Drives" from your sidebar\n2. Browse the available drives\n3. Click on a drive card to open the details\n4. Check your eligibility (shown as a badge)\n5. Click "Will Attend" to confirm your participation\n6. After attending, you can self-report your round results',
  eligibility: 'Eligibility criteria for drives:\n- Each drive has specific requirements set by the admin:\n  • Minimum CGPA\n  • Maximum backlogs\n  • Minimum 10th and 12th percentages\n  • Eligible departments and years\n  • Required skills\n- If you are not eligible, you will see a "Not Eligible" badge with the specific reasons\n- The system automatically checks your profile against the drive criteria',
  profile: 'To update your profile:\n1. Go to "My Profile" from the sidebar\n2. You can edit:\n   - Personal information (name, email, mobile, DOB, gender)\n   - Academic details (CGPA, percentages, backlogs)\n   - Certifications (add/remove)\n   - Projects (add/remove)\n3. Click "Save Changes" to update\n4. You can also update your skills in the "My Skills" section',
  rounds: 'How drive rounds work:\n1. Each drive has multiple rounds (e.g., Aptitude → Coding → GD → Technical HR → General HR)\n2. After marking "Will Attend", you can self-report your round status:\n   - Pending (not yet attempted)\n   - Cleared (passed the round)\n   - Not Cleared (failed the round)\n   - Absent (didn\'t attend)\n   - On Hold (waiting for result)\n3. You must clear previous rounds before the next round unlocks\n4. After all rounds, you can mark your final result (Selected/Not Selected/On Hold)',
  login: 'To login:\n1. Click "Student Login" on the landing page\n2. Enter your Register Number or College Email\n3. Enter your Department Password (this is your login password)\n4. If you forgot your password, contact your placement coordinator\n5. Your session lasts 6 hours before you need to login again',
  notification: 'Notifications:\n- You will receive notifications when:\n  • A new drive is created that matches your eligibility\n  • Your round result is updated\n  • You are marked as Selected\n  • The admin shares a link in the announcement area\n- Check the "Notifications" tab in your sidebar to see all notifications',
  logout: 'To logout:\n1. Click the "Logout" button in the sidebar or top bar\n2. A confirmation popup will appear\n3. Click "Logout" to confirm\n4. You will be redirected to the landing page',
  password: 'Your login password is your Department Password. Each department has its own password set by the placement office. Contact your placement coordinator if you don\'t know your department password.',
  drive: 'A placement drive is a recruitment event organized by a company. Each drive has:\n- A company (e.g., TCS, Infosys)\n- A job role and CTC\n- Eligibility criteria (CGPA, backlogs, skills)\n- Multiple rounds of selection\n- A drive date and location\n- An announcement area where the admin can share links',
  selected: 'When you are marked as Selected:\n1. Your placement status changes to "Placed"\n2. You receive a notification\n3. The drive is marked as "SELECTED" status\n4. Shared link access is locked (you can no longer access shared links)\n5. Your round status form is locked\n6. The placement officer is notified via email',
  skills: 'To manage your skills:\n1. Go to "My Skills" from the sidebar\n2. Select your skills from the available list (100+ skills available)\n3. Mark your strong skills (a subset of your selected skills)\n4. Skills are used for:\n   - Drive recommendations\n   - Eligibility checks (if the drive requires specific skills)\n   - Analytics for the placement office',
}

function findAnswer(question: string): string {
  const q = question.toLowerCase()
  for (const [key, answer] of Object.entries(KNOWLEDGE_BASE)) {
    if (q.includes(key) || q.includes(key.replace(/s$/, ''))) {
      return answer
    }
  }
  // Fallback: check for common keywords
  if (q.includes('help') || q.includes('guide') || q.includes('how')) {
    return 'I can help you with:\n• Registration\n• Login\n• Applying for drives\n• Eligibility criteria\n• Profile updates\n• Round status\n• Skills management\n• Notifications\n• Logout\n\nAsk me about any of these topics!'
  }
  return 'I\'m here to help! You can ask me about:\n• How to register\n• How to apply for drives\n• Eligibility criteria\n• Profile updates\n• Round status\n• Skills\n• Notifications\n• Login/Logout\n\nWhat would you like to know?'
}

export function StudentAgent() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Hi! I\'m your VSBEC Placement Assistant. I can help you with registration, drives, eligibility, profile, rounds, and more. How can I help you today?',
    },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const [sending, setSending] = useState(false)

  const sendMessage = async (text: string) => {
    const question = text.trim()
    if (!question || sending) return
    const userMessage: Message = { role: 'user', content: question }
    const history = messages.map(message => ({ role: message.role, content: message.content })).slice(-10)
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSending(true)
    try {
      const response = await fetch('/api/student-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, messages: history }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'The assistant could not answer right now.')
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'I could not form an answer. Please try asking another way.' }])
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: error.message || 'I could not connect to the assistant. Please try again.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
          title="Ask the VSBEC Assistant"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
            <Sparkles className="h-3 w-3" />
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-[9998] flex h-[500px] w-[360px] flex-col rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">VSBEC Assistant</p>
                <p className="text-[10px] opacity-80">AI-powered student help</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {sending && (
            <div className="px-3 pb-2 text-xs text-muted-foreground" role="status">Thinking…</div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(input) }}
              placeholder="Ask a question..."
              className="flex-1 text-sm"
            />
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
