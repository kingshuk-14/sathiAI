import React, { useState, useEffect } from 'react'
import Tesseract from 'tesseract.js'

const App = () => {
  // Configuration - no need to expose API key to frontend
  // Backend handles API calls securely
  const API_ENDPOINT = '/api/chat'

  // State management
  const [showApp, setShowApp] = useState(false)
  const [inputText, setInputText] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')

  // Add CSS animation for spinner on component mount
  useEffect(() => {
    const styleSheet = document.createElement('style')
    styleSheet.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      button:hover:not(:disabled) {
        background-color: #6B5344 !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      }
      
      button:active:not(:disabled) {
        transform: translateY(0);
      }
      
      textarea:focus {
        outline: none;
        border-color: #8B7355 !important;
        box-shadow: 0 0 8px rgba(139, 115, 85, 0.2);
      }
    `
    document.head.appendChild(styleSheet)
    return () => document.head.removeChild(styleSheet)
  }, [])

  // Handle image upload and OCR
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setOcrLoading(true)
    setError('')
    setResponse('')

    try {
      const result = await Tesseract.recognize(file, 'eng')
      const text = result.data.text
      setExtractedText(text)
      setInputText(text)
    } catch (err) {
      setError('Failed to read image. Please try again or paste text instead.')
      console.error(err)
    } finally {
      setOcrLoading(false)
    }
  }

  // Handle text input change
  const handleTextChange = (e) => {
    setInputText(e.target.value)
  }

  // MASTER CLASSIFICATION SYSTEM
  const classifyMessage = (text) => {
    const lower = text.toLowerCase()
    const hasLink = /http|\.com|\.co\.in|link/.test(lower)
    const hasUrgency = /urgent|today|immediately|blocked|suspended|action required|asap/.test(lower)
    const isTransactionAlert = /debited|credited|debit|credit|transaction|amount|rs\.|rupees|₹|paid|received|transfer/.test(lower)

    // 1. BANK - KYC, account, net banking, cards, transactions
    if (/kyc|account blocked|net banking|debit card|credit card|bank account|re-login|verify account|update details|transaction alert|sbi|hdfc|icici|axis|rbi|upi/.test(lower)) {
      return {
        category: 'bank',
        hasLink,
        hasUrgency,
        riskDefault: hasLink && hasUrgency ? 'high' : isTransactionAlert && !hasLink ? 'medium' : 'medium'
      }
    }

    // 2. MEDICAL - tablets, medicine, doses, doctors
    if (/tablet|mg|medicine|dose|daily|after meals|prescribed|doctor|clinic|hospital|follow up|treatment|medicine name|dosage/.test(lower)) {
      return {
        category: 'medical',
        hasLink,
        hasUrgency,
        riskDefault: 'low'
      }
    }

    // 3. NOTICE - school, office, informational
    if (/notice|school|holiday|vacation|closed|reopen|timetable|schedule|office hours|parents|students|class|exam|result/.test(lower) && !hasLink && !hasUrgency) {
      return {
        category: 'notice',
        hasLink,
        hasUrgency,
        riskDefault: 'low'
      }
    }

    // 4. OTP - one time password
    if (/otp|one time password|verification code|valid for|do not share|verification otp|code is/.test(lower)) {
      return {
        category: 'otp',
        hasLink,
        hasUrgency,
        riskDefault: hasLink ? 'medium' : 'low'
      }
    }

    // 5. DELIVERY - parcel, courier, tracking
    if (/parcel|delivery|shipment|courier|track order|tracking id|amazon|flipkart|blue dart|delhivery|package|order|delivery expected/.test(lower)) {
      return {
        category: 'delivery',
        hasLink,
        hasUrgency,
        riskDefault: hasLink && hasUrgency ? 'medium' : 'low'
      }
    }

    // 6. OBVIOUS SCAM - lottery, prize, crypto
    if (/lottery|won prize|claim reward|processing fee|send bank details|urgent payment|bitcoin|crypto payment|transfer money|lottery winner/.test(lower)) {
      return {
        category: 'scam',
        hasLink,
        hasUrgency,
        riskDefault: 'high'
      }
    }

    // 7. UNKNOWN
    return {
      category: 'unknown',
      hasLink,
      hasUrgency,
      riskDefault: 'medium'
    }
  }

  // TEMPLATE BUILDERS FOR EACH CATEGORY
  const buildBankPrompt = (text) => {
    return `You are helping an older adult understand a bank message. This is IMPORTANT for their financial safety.

BANK MESSAGE ANALYSIS RULES:
- Transaction alerts (money debited/credited) WITHOUT links = Usually legitimate = "Unlikely scam"
- Messages with links + urgency + verification request = "Likely scam"
- Banks do NOT ask for KYC via random links
- Banks do NOT ask for passwords, OTP, or card numbers via SMS
- Always recommend calling official bank number (back of debit card)

Your response MUST follow this exact structure:

1. IS THIS LIKELY A SCAM?
   If NO link present: Say "Unlikely scam" - this is normal bank notification
   If link present: Say "Likely scam" - never click links
   Explain why
   Advise: Call bank directly if unsure

2. IS THIS IMPORTANT?
   Say: High urgency
   Explain: Your money and account information
   But: Verify by calling bank, not by clicking links

3. WHAT THIS MESSAGE IS ABOUT:
   Explain what happened (money in/out, account update)
   Explain the amount and date if given
   Note: Legitimate banks show transaction details clearly

4. WHAT SHOULD I DO?
   If no link: This is a normal notification, save it for your records
   If link present: Do NOT click it
   To verify: Call your bank on the number from your debit card
   Never share: OTP, password, card details

Universal Rules: Use simple language. No asterisks. Prioritize safety.

Message:
"""
${text}
"""`
  }

  const buildMedicalPrompt = (text) => {
    return `You are helping an older adult understand a medical message. Focus on clarity and safety.

MEDICAL MESSAGE RULES:
- Never guess treatment duration
- Never change dosage instructions
- Never assume how many days of medicine left
- Always recommend contacting doctor if unsure

Your response MUST follow this exact structure:

1. IS THIS LIKELY A SCAM?
   Say: Unlikely (if from clinic/pharmacy)
   Say: Confirm with doctor (if unknown source)
   Explain: Medical messages are usually from clinics

2. IS THIS IMPORTANT?
   Say: Medium to High urgency
   Explain: Medical instructions must be followed carefully
   Warn: Not following correctly could affect health

3. WHAT THIS MESSAGE IS ABOUT:
   Explain the medicine name clearly
   Explain the dose (how much)
   Explain frequency (how often)
   Explain duration (how many days)
   Note any missing information

4. WHAT SHOULD I DO?
   Confirm medicine name with doctor
   Follow dosage exactly as written
   Complete full course if instructed
   Do NOT change dose without doctor approval
   Contact doctor if:
     - You feel worse
     - You have side effects
     - Instructions are unclear

Universal Rules: Use simple language. No asterisks. Prioritize health safety.

Message:
"""
${text}
"""`
  }

  const buildNoticePrompt = (text) => {
    return `You are helping an older adult understand an informational notice. Keep it simple and clear.

NOTICE MESSAGE RULES:
- Usually safe and informational
- Flag only if contains payment/login requests
- Focus on explaining the information

Your response MUST follow this exact structure:

1. IS THIS LIKELY A SCAM?
   Say: Unlikely
   Explain: This appears to be official information
   Flag if: Contains payment or login request (then: Possibly scam)

2. IS THIS IMPORTANT?
   Say: Low or Medium urgency
   Explain: This is informational about schedules/closures
   Warn if: Urgent action required (then: Medium)

3. WHAT THIS MESSAGE IS ABOUT:
   Explain what the notice is announcing
   Explain who it affects (students/staff/public)
   List key details (dates, times, locations)

4. WHAT SHOULD I DO?
   Note down the key information
   Keep the message safe (you may need it later)
   Follow the instructions if any action needed
   Ask at school/office if you have questions

Universal Rules: Use simple language. No asterisks. Be clear and helpful.

Message:
"""
${text}
"""`
  }

  const buildOTPPrompt = (text) => {
    return `You are helping an older adult understand an OTP (One-Time Password) message. This is about security.

OTP MESSAGE RULES:
- "Likely scam" if OTP is in a suspicious link
- "Unlikely" if normal OTP message
- Strong warning: NEVER share OTP
- OTP is personal security code

Your response MUST follow this exact structure:

1. IS THIS LIKELY A SCAM?
   Say: Unlikely (if normal OTP text)
   Say: Possibly scam (if in suspicious link/email)
   Warn: Real banks NEVER ask for your OTP
   Never share: OTP with anyone

2. IS THIS IMPORTANT?
   Say: High urgency
   Explain: OTP is your security code
   Warn: Sharing OTP = someone can access your account

3. WHAT THIS MESSAGE IS ABOUT:
   Explain: This is a code for verifying your identity
   Explain: It's temporary (usually 10 minutes)
   Explain: Only YOU should use it

4. WHAT SHOULD I DO?
   Check: Is this OTP expected? (Did you request login/payment?)
   Use it: Only to complete YOUR action
   NEVER share: OTP with anyone
   NEVER enter: OTP on websites sent via links
   If suspicious: Contact the company directly

Universal Rules: Use simple language. No asterisks. Safety first.

Message:
"""
${text}
"""`
  }

  const buildDeliveryPrompt = (text) => {
    return `You are helping an older adult understand a delivery message about packages/orders.

DELIVERY MESSAGE RULES:
- Flag as scam if: link + payment request
- Usually safe if: just tracking info
- NEVER click suspicious delivery links

Your response MUST follow this exact structure:

1. IS THIS LIKELY A SCAM?
   Say: Unlikely (if tracking update only)
   Say: Possibly scam (if payment/link requested)
   Explain: Scammers use fake delivery messages to steal money

2. IS THIS IMPORTANT?
   Say: Low urgency (if tracking only)
   Say: High urgency (if payment requested)
   Explain: Real companies don't ask for payment via random links

3. WHAT THIS MESSAGE IS ABOUT:
   Explain: Package/parcel status update
   Explain: Delivery date or tracking info
   Flag: Any payment or suspicious link request

4. WHAT SHOULD I DO?
   Check: Did you order this package?
   Wait: Delivery company will deliver it
   Do NOT click: Links from messages
   Open: Official website or app directly to track
   If payment asked: Contact company directly instead

Universal Rules: Use simple language. No asterisks. Safety first.

Message:
"""
${text}
"""`
  }

  const buildScamPrompt = (text) => {
    return `You are helping an older adult who received an obvious scam message. Be clear and protective.

SCAM MESSAGE RULES:
- No ambiguity here - this IS a scam attempt
- Clear warning needed
- Advise not to respond or engage

Your response MUST follow this exact structure:

1. IS THIS LIKELY A SCAM?
   Say: Likely scam
   Explain: This message is trying to trick you into sending money
   Warn: Scammers prey on urgency and excitement

2. IS THIS IMPORTANT?
   Say: High urgency
   Explain: You could lose money if you respond
   Warn: Every scam tries to seem urgent and real

3. WHAT THIS MESSAGE IS ABOUT:
   Explain: This is a scam trying to get money
   Explain: What they claim to offer (prize, reward, etc.)
   Explain: How the scam works

4. WHAT SHOULD I DO?
   Do NOT respond to the message
   Do NOT send any money
   Do NOT share personal information
   Delete the message immediately
   If already sent money: Contact police immediately

Universal Rules: Use simple language. No asterisks. Be protective.

Message:
"""
${text}
"""`
  }

  const buildUnknownPrompt = (text) => {
    return `You are helping an older adult understand a message that could be anything. Be cautious.

MESSAGE RULES:
- When unsure, advise caution
- Suggest verifying the source
- General safety principles apply

Your response MUST follow this exact structure:

1. IS THIS LIKELY A SCAM?
   Say: Possibly scam (when uncertain)
   Explain: This message doesn't clearly match a known type
   Advise: Verify before taking action

2. IS THIS IMPORTANT?
   Say: Medium urgency
   Explain: Take time to understand before acting
   Warn: Don't rush into actions

3. WHAT THIS MESSAGE IS ABOUT:
   Explain: What the message appears to be saying
   Note: What is unclear or missing
   Suggest: Information that would help verify

4. WHAT SHOULD I DO?
   Pause: Don't respond immediately
   Verify: Check if source is real
   Ask: Someone you trust to review it
   Be cautious: With links and sharing information
   Contact official source: If you're unsure

Universal Rules: Use simple language. No asterisks. Advise caution.

Message:
"""
${text}
"""`
  }

  // Select prompt based on classification
  const selectPrompt = (text) => {
    const classification = classifyMessage(text)
    
    switch (classification.category) {
      case 'bank':
        return buildBankPrompt(text)
      case 'medical':
        return buildMedicalPrompt(text)
      case 'notice':
        return buildNoticePrompt(text)
      case 'otp':
        return buildOTPPrompt(text)
      case 'delivery':
        return buildDeliveryPrompt(text)
      case 'scam':
        return buildScamPrompt(text)
      case 'unknown':
      default:
        return buildUnknownPrompt(text)
    }
  }

  // Submit to LLM
  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setError('Please enter text or upload an image.')
      return
    }

    setLoading(true)
    setError('')
    setResponse('')

    const finalText = inputText || extractedText
    const prompt = selectPrompt(finalText)

    try {
      const requestBody = {
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 900,
        temperature: 0.7
      }

      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }

      console.log('Calling backend endpoint:', API_ENDPOINT)
      const res = await fetch(API_ENDPOINT, fetchOptions)
      
      console.log('API Response Status:', res.status)
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('API Error Response:', errorData)
        throw new Error(errorData.error || `API error: ${res.status}`)
      }

      const data = await res.json()
      console.log('API Response Data:', data)

      // Handle OpenAI/HuggingFace chat completion response format
      const llmResponse = data?.choices?.[0]?.message?.content
      
      if (!llmResponse) {
        throw new Error('Invalid response format from API')
      }

      setResponse(llmResponse.trim())
    } catch (err) {
      setError(
        `Error: ${err.message}`
      )
      console.error('Full error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Clear all
  const handleReset = () => {
    setInputText('')
    setExtractedText('')
    setResponse('')
    setError('')
  }

  // Parse response into sections
  const parseResponse = (text) => {
    const sections = {
      scam: '',
      importance: '',
      about: '',
      action: ''
    }

    const lines = text.split('\n')
    let currentSection = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.includes('IS THIS LIKELY A SCAM')) {
        currentSection = 'scam'
        sections.scam = ''
      } else if (line.includes('IS THIS IMPORTANT')) {
        currentSection = 'importance'
        sections.importance = ''
      } else if (line.includes('WHAT THIS MESSAGE IS ABOUT')) {
        currentSection = 'about'
        sections.about = ''
      } else if (line.includes('WHAT SHOULD I DO')) {
        currentSection = 'action'
        sections.action = ''
      } else if (currentSection && line.trim()) {
        sections[currentSection] += line + '\n'
      }
    }

    // Clean up sections
    Object.keys(sections).forEach(key => {
      sections[key] = sections[key].trim()
    })

    return sections
  }

  // Get scam level for meter - based on confidence NOT just presence of word "scam"
  const getScamLevel = (scamText) => {
    const lower = scamText.toLowerCase()
    
    // HIGH RISK (RED) - Strong confidence it's a scam
    if (lower.includes('definitely scam') || lower.includes('definitely a scam') || 
        (lower.includes('likely scam') && !lower.includes('if'))) {
      return 'high'
    }
    
    // LOW RISK (GREEN) - Unlikely/Not a scam
    if (lower.includes('unlikely') || lower.includes('no scam') || lower.includes('not a scam')) {
      return 'low'
    }
    
    // MEDIUM RISK (YELLOW) - Could be, probably, possibly
    if (lower.includes('could be') || lower.includes('probably') || lower.includes('possibly') ||
        lower.includes('may be') || lower.includes('might be') || lower.includes('if')) {
      return 'medium'
    }
    
    // Default to medium
    return 'medium'
  }

  // Get urgency level
  const getUrgencyLevel = (importanceText) => {
    const lower = importanceText.toLowerCase()
    if (lower.includes('high')) return 'high'
    if (lower.includes('medium')) return 'medium'
    if (lower.includes('low')) return 'low'
    return 'unknown'
  }

  return (
    <div style={styles.container}>
      {!showApp ? (
        // LANDING PAGE
        <div style={styles.landingPage}>
          <div style={styles.landingContent}>
            <img src="/logo.png" alt="sathiAI" style={styles.landingLogo} />
            <h1 style={styles.landingTitle}>sathiAI</h1>
            <p style={styles.landingTagline}>Protect yourself from scams</p>
            
            <div style={styles.landingInstructions}>
              <h2 style={styles.instructionsTitle}>How to Use sathiAI</h2>
              
              <div style={styles.instructionCard}>
                <div style={styles.stepNumber}>1</div>
                <div>
                  <h3 style={styles.instructionCardTitle}>Upload or Paste</h3>
                  <p style={styles.instructionCardText}>
                    Upload a screenshot of a confusing message or paste the text directly
                  </p>
                </div>
              </div>

              <div style={styles.instructionCard}>
                <div style={styles.stepNumber}>2</div>
                <div>
                  <h3 style={styles.instructionCardTitle}>Click Analyze</h3>
                  <p style={styles.instructionCardText}>
                    Let AI analyze the message for potential scams or important information
                  </p>
                </div>
              </div>

              <div style={styles.instructionCard}>
                <div style={styles.stepNumber}>3</div>
                <div>
                  <h3 style={styles.instructionCardTitle}>Get Clear Answers</h3>
                  <p style={styles.instructionCardText}>
                    Read simple explanations about whether it's safe, what it means, and what to do
                  </p>
                </div>
              </div>

              <div style={styles.instructionCard}>
                <div style={styles.stepNumber}>4</div>
                <div>
                  <h3 style={styles.instructionCardTitle}>Stay Safe</h3>
                  <p style={styles.instructionCardText}>
                    Never click suspicious links or share personal information based on alerts
                  </p>
                </div>
              </div>
            </div>

            <div style={styles.warningBox}>
              <strong>Remember:</strong> Always call your bank, doctor, or official organization directly using numbers from official sources - never use numbers from messages.
            </div>

            <button 
              onClick={() => setShowApp(true)}
              style={styles.startButton}
            >
              Start Using sathiAI
            </button>
          </div>
        </div>
      ) : (
        // MAIN APP
        <>
      {/* Header with Logo */}
      <div style={styles.navbar}>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo.png" alt="sathiAI" style={styles.logo} />
          <h1 style={styles.heading}>sathiAI</h1>
        </div>
        <button 
          onClick={() => setShowApp(false)}
          style={styles.backButton}
        >
          ← Back to Home
        </button>
      </div>
      <p style={styles.subtitle}>
        Get help understanding confusing text messages, notices, and alerts
      </p>

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Main Content */}
      <div style={styles.mainContent}>
        {!response ? (
          <>
            {/* Upload Section */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Upload an Image</h2>
              <label htmlFor="imageInput" style={styles.fileInputLabel}>
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={styles.fileInput}
                  disabled={loading || ocrLoading}
                />
                <span style={styles.uploadButton}>
                  {ocrLoading ? 'Reading image...' : 'Choose Image or Screenshot'}
                </span>
              </label>
            </div>

            {/* Divider */}
            <div style={styles.divider}>OR</div>

            {/* Text Input Section */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Paste Your Message</h2>
              <textarea
                value={inputText}
                onChange={handleTextChange}
                placeholder="Paste your message here..."
                style={styles.textarea}
                disabled={loading || ocrLoading}
              />
            </div>

            {/* Preview of Extracted Text */}
            {extractedText && (
              <div style={styles.previewBox}>
                <h3 style={styles.previewTitle}>Text to be explained:</h3>
                <p style={styles.previewText}>{extractedText}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading || ocrLoading || !inputText.trim()}
              style={{
                ...styles.submitButton,
                opacity:
                  loading || ocrLoading || !inputText.trim() ? 0.6 : 1,
                cursor:
                  loading || ocrLoading || !inputText.trim()
                    ? 'not-allowed'
                    : 'pointer'
              }}
            >
              {loading ? 'Getting explanation...' : 'Get Explanation'}
            </button>
          </>
        ) : (
          <>
            {/* Response Display - Card Based */}
            <div style={styles.responseContainer}>
              {(() => {
                const sections = parseResponse(response)
                const scamLevel = getScamLevel(sections.scam)
                const urgencyLevel = getUrgencyLevel(sections.importance)

                return (
                  <>
                    {/* Scam Meter Card */}
                    <div style={styles.card}>
                      <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Scam Risk</h3>
                      </div>
                      <div style={styles.cardContent}>
                        <div style={styles.meterContainer}>
                          <div style={styles.meterBar}>
                            <div style={{
                              width: scamLevel === 'high' ? '100%' : scamLevel === 'medium' ? '60%' : '20%',
                              height: '100%',
                              backgroundColor: scamLevel === 'high' ? '#C1272D' : scamLevel === 'medium' ? '#F59E0B' : '#10B981',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          <div style={styles.meterLabel}>
                            {scamLevel === 'high' && 'HIGH RISK'}
                            {scamLevel === 'medium' && 'MEDIUM RISK'}
                            {scamLevel === 'low' && 'LOW RISK'}
                          </div>
                        </div>
                        <p style={styles.cardText}>{sections.scam}</p>
                      </div>
                    </div>

                    {/* Urgency Card */}
                    <div style={styles.card}>
                      <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Importance Level</h3>
                      </div>
                      <div style={styles.cardContent}>
                        <div style={{
                          ...styles.urgencyBadge,
                          backgroundColor: urgencyLevel === 'high' ? '#C1272D' : urgencyLevel === 'medium' ? '#F59E0B' : '#10B981',
                          color: 'white'
                        }}>
                          {urgencyLevel === 'high' && 'HIGH'}
                          {urgencyLevel === 'medium' && 'MEDIUM'}
                          {urgencyLevel === 'low' && 'LOW'}
                        </div>
                        <p style={styles.cardText}>{sections.importance}</p>
                      </div>
                    </div>

                    {/* Message Meaning Card */}
                    <div style={styles.card}>
                      <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>What This Message Means</h3>
                      </div>
                      <div style={styles.cardContent}>
                        <p style={styles.cardText}>{sections.about}</p>
                      </div>
                    </div>

                    {/* Action Card */}
                    <div style={styles.card}>
                      <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>What You Should Do</h3>
                      </div>
                      <div style={styles.cardContent}>
                        <p style={styles.cardText}>{sections.action}</p>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Reset Button */}
            <button onClick={handleReset} style={styles.resetButton}>
              Explain Another Message
            </button>
          </>
        )}
      </div>

      {/* Loading Spinner */}
      {(loading || ocrLoading) && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>
            {ocrLoading ? 'Reading image...' : 'Getting explanation...'}
          </p>
        </div>
      )}
        </>
      )}
    </div>
  )
}

// Styles (all inline for simplicity)
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F1E8',
    padding: '30px 20px',
    fontFamily: '"Georgia", "Garamond", serif',
    fontSize: '18px'
  },
  // Landing Page Styles
  landingPage: {
    minHeight: '100vh',
    backgroundColor: '#F5F1E8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px'
  },
  landingContent: {
    maxWidth: '700px',
    textAlign: 'center',
    backgroundColor: '#FAF8F3',
    padding: '60px 40px',
    borderRadius: '4px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
    border: '1px solid #E8E3D8'
  },
  landingLogo: {
    height: '100px',
    width: '100px',
    borderRadius: '50%',
    objectFit: 'cover',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    border: '3px solid #DAA520',
    marginBottom: '20px'
  },
  landingTitle: {
    fontSize: '56px',
    fontWeight: '300',
    color: '#3D3D3D',
    marginBottom: '8px',
    letterSpacing: '2px',
    fontFamily: '"Georgia", serif'
  },
  landingTagline: {
    fontSize: '20px',
    color: '#8B7355',
    fontStyle: 'italic',
    marginBottom: '40px',
    fontWeight: '300'
  },
  landingInstructions: {
    marginBottom: '40px',
    textAlign: 'left'
  },
  instructionsTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#5C4033',
    marginBottom: '30px',
    textAlign: 'center',
    letterSpacing: '0.5px'
  },
  instructionCard: {
    display: 'flex',
    gap: '20px',
    marginBottom: '25px',
    padding: '20px',
    backgroundColor: '#FFFBF5',
    borderRadius: '4px',
    border: '1px solid #E8E3D8'
  },
  stepNumber: {
    minWidth: '50px',
    height: '50px',
    backgroundColor: '#DAA520',
    color: '#FAF8F3',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    flexShrink: 0,
    fontFamily: '"Georgia", serif'
  },
  instructionCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#5C4033',
    marginBottom: '8px'
  },
  instructionCardText: {
    fontSize: '16px',
    color: '#6B6B6B',
    lineHeight: '1.6',
    fontFamily: '"Georgia", serif'
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    border: '2px solid #F59E0B',
    padding: '20px',
    borderRadius: '4px',
    marginBottom: '30px',
    fontSize: '16px',
    color: '#92400E',
    fontFamily: '"Georgia", serif',
    lineHeight: '1.6'
  },
  startButton: {
    width: '100%',
    backgroundColor: '#8B7355',
    color: '#FAF8F3',
    padding: '18px',
    borderRadius: '4px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid #6B5344',
    fontFamily: '"Georgia", serif',
    letterSpacing: '0.5px',
    marginTop: '10px'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#DAA520',
    color: '#3D3D3D',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: '"Georgia", serif'
  },
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '15px',
    marginBottom: '20px',
    position: 'relative'
  },
  logo: {
    height: '60px',
    width: '60px',
    borderRadius: '50%',
    objectFit: 'cover',
    boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
    border: '2px solid #DAA520'
  },
  heading: {
    fontSize: '48px',
    fontWeight: '300',
    textAlign: 'center',
    color: '#3D3D3D',
    marginBottom: '5px',
    letterSpacing: '1px',
    fontFamily: '"Georgia", serif'
  },
  subtitle: {
    fontSize: '18px',
    textAlign: 'center',
    color: '#6B6B6B',
    marginBottom: '40px',
    fontStyle: 'italic',
    fontWeight: '300'
  },
  mainContent: {
    maxWidth: '700px',
    margin: '0 auto',
    backgroundColor: '#FAF8F3',
    padding: '50px 40px',
    borderRadius: '4px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
    border: '1px solid #E8E3D8'
  },
  errorBox: {
    backgroundColor: '#FFF3E0',
    border: '2px solid #D97706',
    padding: '20px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '16px',
    color: '#92400E',
    maxWidth: '700px',
    margin: '0 auto 20px auto',
    fontFamily: '"Georgia", serif'
  },
  section: {
    marginBottom: '40px'
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#5C4033',
    marginBottom: '20px',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #DAA520',
    paddingBottom: '10px'
  },
  fileInputLabel: {
    display: 'block',
    cursor: 'pointer'
  },
  fileInput: {
    display: 'none'
  },
  uploadButton: {
    display: 'block',
    width: '100%',
    backgroundColor: '#8B7355',
    color: '#FAF8F3',
    padding: '20px',
    borderRadius: '4px',
    fontSize: '18px',
    fontWeight: '600',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid #6B5344',
    fontFamily: '"Georgia", serif',
    letterSpacing: '0.5px'
  },
  divider: {
    textAlign: 'center',
    margin: '35px 0',
    fontSize: '16px',
    fontWeight: '300',
    color: '#A39F96',
    letterSpacing: '2px'
  },
  textarea: {
    width: '100%',
    minHeight: '160px',
    padding: '18px',
    fontSize: '16px',
    border: '2px solid #D4CFBF',
    borderRadius: '4px',
    fontFamily: '"Georgia", serif',
    boxSizing: 'border-box',
    resize: 'vertical',
    backgroundColor: '#FFFBF5',
    color: '#3D3D3D',
    lineHeight: '1.8'
  },
  previewBox: {
    backgroundColor: '#F0EBE0',
    border: '2px solid #DAA520',
    padding: '20px',
    borderRadius: '4px',
    marginBottom: '30px'
  },
  previewTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#5C4033',
    letterSpacing: '0.5px'
  },
  previewText: {
    fontSize: '15px',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    color: '#4A4A4A',
    lineHeight: '1.7',
    fontFamily: '"Georgia", serif'
  },
  submitButton: {
    width: '100%',
    padding: '22px',
    fontSize: '18px',
    fontWeight: '600',
    backgroundColor: '#8B7355',
    color: '#FAF8F3',
    border: '2px solid #6B5344',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: '"Georgia", serif',
    letterSpacing: '0.5px'
  },
  responseBox: {
    backgroundColor: '#FFFBF5',
    border: '3px solid #DAA520',
    padding: '40px',
    borderRadius: '4px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  responseContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
    marginBottom: '30px'
  },
  card: {
    backgroundColor: '#FFFBF5',
    border: '2px solid #D4CFBF',
    borderRadius: '6px',
    overflow: 'hidden',
    boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease'
  },
  cardHeader: {
    backgroundColor: '#F0EBE0',
    borderBottom: '3px solid #DAA520',
    padding: '16px 20px',
    marginBottom: '0'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#5C4033',
    margin: '0',
    letterSpacing: '0.5px'
  },
  cardContent: {
    padding: '20px'
  },
  cardText: {
    fontSize: '16px',
    lineHeight: '1.8',
    color: '#3D3D3D',
    fontFamily: '"Georgia", serif',
    margin: '12px 0 0 0',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word'
  },
  meterContainer: {
    marginBottom: '16px'
  },
  meterBar: {
    width: '100%',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: '#E8E3D8',
    overflow: 'hidden',
    border: '2px solid #D4CFBF'
  },
  meterLabel: {
    marginTop: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#5C4033',
    letterSpacing: '0.5px'
  },
  urgencyBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginBottom: '12px'
  },
  responseTitle: {
    fontSize: '26px',
    fontWeight: '300',
    color: '#5C4033',
    marginBottom: '25px',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #DAA520',
    paddingBottom: '12px'
  },
  responseContent: {
    fontSize: '17px',
    lineHeight: '2',
    color: '#3D3D3D',
    fontFamily: '"Georgia", serif'
  },
  responseLine: {
    marginBottom: '12px',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word'
  },
  resetButton: {
    width: '100%',
    padding: '20px',
    fontSize: '18px',
    fontWeight: '600',
    backgroundColor: '#8B7355',
    color: '#FAF8F3',
    border: '2px solid #6B5344',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: '"Georgia", serif',
    letterSpacing: '0.5px'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(61, 61, 61, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  spinner: {
    border: '6px solid #E8E3D8',
    borderTop: '6px solid #8B7355',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '20px',
    color: '#FAF8F3',
    marginTop: '20px',
    textAlign: 'center',
    fontFamily: '"Georgia", serif',
    letterSpacing: '0.5px'
  }
}

export default App
