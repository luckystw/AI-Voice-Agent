import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import mermaid from 'mermaid'
import './App.css'

const questions = [
  'Hello, this is the Voie AI Agent. Can you introduce yourself?',
  'What is your primary skillset?',
  'How many years of experience do you have?',
  'Are you willing to join immediately?'
]

function MermaidDiagram({ chart }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({ startOnLoad: false })
      mermaid.render('mermaid-diagram', chart, (svgCode) => {
        ref.current.innerHTML = svgCode
      })
    }
  }, [chart])
  return <div ref={ref} className="w-full overflow-x-auto" />
}

function App() {
  const [callStarted, setCallStarted] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [step, setStep] = useState(0)
  const [input, setInput] = useState('')
  const [analyzeResult, setAnalyzeResult] = useState(null)
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({ candidate: '', decision: '', insight: '' })
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const recognitionRef = useRef(null)

  // Helper to extract candidate name from transcript
  const extractCandidateName = () => {
    const intro = transcript.find(t => t.from === 'candidate')
    if (intro && intro.text) {
      // Try to extract a name (very basic: look for 'I am ...' or 'My name is ...')
      const match = intro.text.match(/(?:I am|My name is) ([A-Za-z ]+)/i)
      if (match) return match[1].trim()
    }
    return 'Candidate'
  }

  // Fetch feedback on mount and after submission
  const fetchFeedback = () => {
    fetch('http://localhost:8000/feedback')
      .then(res => res.json())
      .then(data => setFeedback(data.feedback || []))
  }
  useEffect(fetchFeedback, [])

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript
      setInput(speechResult)
      setListening(false)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
  }, [])

  const startCall = () => {
    setCallStarted(true)
    setTranscript([{ from: 'agent', text: questions[0] }])
    setStep(0)
    setInput('')
    setAnalyzeResult(null)
    setFeedbackForm({ candidate: '', decision: '', insight: '' })
    setFeedbackSubmitted(false)
  }

  const sendResponse = async () => {
    if (!input.trim()) return
    setLoading(true)
    // Call /transcribe (mocked as text)
    const res = await fetch('http://localhost:8000/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_text: input })
    })
    const data = await res.json()
    const newTranscript = [
      ...transcript,
      { from: 'candidate', text: data.transcript }
    ]
    // If more questions, add next agent question
    if (step + 1 < questions.length) {
      newTranscript.push({ from: 'agent', text: questions[step + 1] })
      setStep(step + 1)
      setTranscript(newTranscript)
      setInput('')
      setLoading(false)
    } else {
      // End of questions, analyze
      setTranscript(newTranscript)
      setInput('')
      // Call /analyze
      const allText = newTranscript.map(t => t.text).join(' ')
      const ares = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: allText })
      })
      const adata = await ares.json()
      setAnalyzeResult(adata)
      // Auto-submit feedback with AI's result
      const candidateName = extractCandidateName()
      const aiFeedback = {
        candidate: candidateName,
        decision: adata.decision,
        insight: `Sentiment: ${adata.sentiment}. Keywords: ${adata.keywords && adata.keywords.join(', ')}.`
      }
      setFeedbackForm(aiFeedback)
      fetch('http://localhost:8000/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiFeedback)
      }).then(() => {
        fetchFeedback()
        setFeedbackSubmitted(true)
      })
      setLoading(false)
    }
  }

  const handleMicClick = () => {
    if (recognitionRef.current && !listening) {
      setListening(true)
      recognitionRef.current.start()
    } else if (recognitionRef.current && listening) {
      recognitionRef.current.stop()
      setListening(false)
    }
  }

  const handleFeedbackChange = (e) => {
    setFeedbackForm({ ...feedbackForm, [e.target.name]: e.target.value })
  }

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    await fetch('http://localhost:8000/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackForm)
    })
    fetchFeedback()
    setFeedbackSubmitted(true)
  }

  let pipelineChart = `graph TD;
    A["Transcription"] --> B["Sentiment/Keywords"];
    B --> C["Decision"];
  `;
  if (analyzeResult) {
    pipelineChart = `graph TD;
      A["Transcription: ✅"] --> B["Sentiment: ${analyzeResult.sentiment}"];
      A --> B2["Keywords: ${analyzeResult.keywords && analyzeResult.keywords.join(', ')}"];
      B & B2 --> C["Decision: ${analyzeResult.decision}"];
    `;
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 -z-10 animate-gradient bg-gradient-to-br from-indigo-200 via-blue-100 to-pink-200" style={{background: 'linear-gradient(120deg, #c7d2fe 0%, #f0abfc 100%)'}} />
      <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none">
        <div className="absolute w-96 h-96 bg-pink-200 opacity-30 rounded-full blur-3xl left-[-10%] top-[-10%] animate-float" />
        <div className="absolute w-80 h-80 bg-indigo-200 opacity-30 rounded-full blur-2xl right-[-8%] bottom-[-8%] animate-float2" />
      </div>
      <motion.h1
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-4xl md:text-6xl font-extrabold text-indigo-700 mb-4 drop-shadow-lg tracking-tight"
      >
        Voie AI Agent
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="text-lg md:text-2xl text-indigo-900 mb-8 font-medium"
      >
        Automated Voice Screening for Candidates
      </motion.p>
      <AnimatePresence>
        {!callStarted && (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={startCall}
            className="px-10 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-pink-400 text-white font-bold shadow-xl text-2xl mb-8 transition-all duration-300 hover:from-indigo-600 hover:to-pink-500"
          >
            Start Screening Call
          </motion.button>
        )}
      </AnimatePresence>
      <div className="w-full max-w-2xl bg-white/60 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8 min-h-[220px] border border-indigo-100">
        <h2 className="text-2xl font-bold text-indigo-700 mb-4 tracking-tight">Live Transcript</h2>
        <div className="space-y-2 min-h-[120px]">
          {transcript.map((line, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={
                line.from === 'agent'
                  ? 'text-indigo-800 font-semibold'
                  : 'text-gray-700 pl-6'
              }
            >
              {line.text}
            </motion.div>
          ))}
        </div>
        {callStarted && (!analyzeResult && step < questions.length) && (
          <form
            className="flex gap-2 mt-6"
            onSubmit={e => {
              e.preventDefault();
              sendResponse();
            }}
          >
            <input
              className="flex-1 rounded-xl px-4 py-3 border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white/80 shadow"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your response..."
              disabled={loading || listening}
              autoFocus
            />
            <button
              type="button"
              onClick={handleMicClick}
              className={`px-4 py-2 rounded-full bg-pink-500 text-white font-bold shadow flex items-center justify-center ${listening ? 'animate-pulse' : ''}`}
              disabled={loading}
              title={listening ? 'Listening...' : 'Speak your answer'}
            >
              <span role="img" aria-label="mic">🎤</span>
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-semibold shadow hover:bg-indigo-600 transition"
              disabled={loading}
            >
              Send
            </button>
          </form>
        )}
        {/* Feedback Form after analysis */}
        {analyzeResult && !feedbackSubmitted && (
          <form className="mt-8 bg-white/70 p-6 rounded-2xl shadow flex flex-col gap-3 border border-indigo-100" onSubmit={handleFeedbackSubmit}>
            <div className="font-bold text-indigo-700 mb-1 text-lg">Submit Feedback</div>
            <input
              className="rounded-xl px-4 py-3 border border-indigo-200 bg-white/90"
              name="candidate"
              value={feedbackForm.candidate}
              onChange={handleFeedbackChange}
              placeholder="Candidate Name"
              required
            />
            <input
              className="rounded-xl px-4 py-3 border border-indigo-200 bg-white/90"
              name="decision"
              value={feedbackForm.decision}
              onChange={handleFeedbackChange}
              placeholder="Decision"
              required
            />
            <textarea
              className="rounded-xl px-4 py-3 border border-indigo-200 bg-white/90"
              name="insight"
              value={feedbackForm.insight}
              onChange={handleFeedbackChange}
              placeholder="Insight"
              required
            />
            <button type="submit" className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-400 text-white font-bold shadow self-end hover:from-indigo-600 hover:to-pink-500 transition">Submit</button>
          </form>
        )}
        {feedbackSubmitted && (
          <div className="mt-4 text-green-700 font-semibold">Feedback submitted!</div>
        )}
      </div>
      {/* Feedback Cards */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.6 }}
        className="w-full max-w-2xl flex flex-col md:flex-row gap-6"
      >
        {feedback.length > 0 && feedback.map((f, i) => (
          <div key={i} className="flex-1 bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border-l-8 border-indigo-400 hover:scale-[1.03] transition-transform duration-200">
            <div className="font-bold text-indigo-700 text-lg mb-1">{f.candidate}</div>
            <div className="text-gray-700 mb-1">Decision: <span className="font-semibold">{f.decision}</span></div>
            <div className="text-gray-600 italic mt-1">{f.insight}</div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export default App
