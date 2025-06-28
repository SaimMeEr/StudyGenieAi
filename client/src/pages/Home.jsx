import { useSelector } from 'react-redux'
import React, { useEffect, useState } from 'react'
import { apiConnector } from "../services/apiConnector"
import { quizEndpoints } from "../services/APIs/index"
import QuizCard from '../components/core/Home/QuizCard'
import axios from 'axios'

const Home = () => {

  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const { token } = useSelector(state => state.auth)
  const [syllabus, setSyllabus] = useState("");
  const [plan, setPlan] = useState(null);
  const [generatedQuizzes, setGeneratedQuizzes] = useState([]);
  const [genLoading, setGenLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [checked, setChecked] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const GEMINI_API_KEY = "AIzaSyDhDhiKFkaYAp-o0lGL4e4uJSYIJSh6paY";
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const fetchQuizzes = async () => {
    setLoading(true)
    try {
      const response = await apiConnector("GET", quizEndpoints.GET_ALL_QUIZES, null, {
        Authorization: `Bearer ${token}`
      })

      if (!response.data.success) {
        throw new Error(response.data.message)
      }

      setQuizzes(response.data.data);

    } catch (e) {
      console.log("COULDNT GET QUIZZES")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!syllabus.trim()) return;
    setGenLoading(true);
    setPlan(null);
    setGeneratedQuizzes([]);
    try {
      const prompt = `Given the following syllabus: "${syllabus}", generate a professional study plan (summary/roadmap) and 10 multiple-choice quiz questions with 4 options each. Format the response as JSON: { plan: string, quizzes: [{ question: string, options: string[], answer: string }] }`;
      const response = await axios.post(
        GEMINI_API_URL,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Try to parse JSON from the response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setPlan(parsed.plan);
        setGeneratedQuizzes(parsed.quizzes);
      } else {
        setPlan("Could not parse plan. Please try again.");
      }
    } catch (err) {
      setPlan("Error generating plan. Please try again.");
    } finally {
      setGenLoading(false);
    }
  };

  const handleSave = () => {
    if (plan && generatedQuizzes.length) {
      const saved = { plan, quizzes: generatedQuizzes, syllabus, date: new Date().toISOString() };
      const prev = JSON.parse(localStorage.getItem('studyai_saved') || '[]');
      localStorage.setItem('studyai_saved', JSON.stringify([saved, ...prev]));
      alert('Plan and quizzes saved!');
    }
  };

  const handleOptionChange = (quizIdx, optionIdx) => {
    const updated = [...userAnswers];
    updated[quizIdx] = optionIdx;
    setUserAnswers(updated);
  };

  const handleCheck = (quizIdx) => {
    if (checked[quizIdx]) return; // Prevent re-checking
    const selected = userAnswers[quizIdx];
    const correct = generatedQuizzes[quizIdx]?.options[selected] === generatedQuizzes[quizIdx]?.answer;
    const newChecked = [...checked];
    newChecked[quizIdx] = true;
    setChecked(newChecked);
    const newFeedback = [...feedback];
    newFeedback[quizIdx] = correct;
    setFeedback(newFeedback);
  };

  // Reset answers and feedback when new quizzes are generated
  React.useEffect(() => {
    setUserAnswers(Array(generatedQuizzes.length).fill(null));
    setChecked(Array(generatedQuizzes.length).fill(false));
    setFeedback(Array(generatedQuizzes.length).fill(null));
  }, [generatedQuizzes]);

  const handleSubmitAll = () => {
    let correct = 0;
    generatedQuizzes.forEach((q, idx) => {
      if (q.options[userAnswers[idx]] === q.answer) correct++;
    });
    const total = generatedQuizzes.length;
    const incorrect = total - correct;
    const percent = Math.round((correct / total) * 100);
    setResult({ correct, incorrect, total, percent });
    setSubmitted(true);
    // Save result
    if (plan && generatedQuizzes.length) {
      const saved = { plan, quizzes: generatedQuizzes, syllabus, date: new Date().toISOString(), result: { correct, incorrect, total, percent } };
      const prev = JSON.parse(localStorage.getItem('studyai_saved') || '[]');
      localStorage.setItem('studyai_saved', JSON.stringify([saved, ...prev]));
    }
  };

  const handleNewPlan = () => {
    setSyllabus("");
    setPlan(null);
    setGeneratedQuizzes([]);
    setUserAnswers([]);
    setChecked([]);
    setFeedback([]);
    setSubmitted(false);
    setResult(null);
  };

  useEffect(() => {
    fetchQuizzes();
  }, [])

  return (
    <section className="min-h-[90vh] border-t border-green-900 py-5 mt-3 bg-gradient-to-br from-gray-900 to-green-950">
      {/* Syllabus Input & Generate UI */}
      <div className="max-w-xl mx-auto mb-8 p-8 bg-green-950/90 rounded-3xl shadow-2xl flex flex-col items-center gap-6 backdrop-blur-md border border-green-800">
        <h1 className="text-3xl font-extrabold text-green-400 mb-2 text-center drop-shadow">AI Study Plan & Quiz Generator</h1>
        <input
          type="text"
          className="w-full px-5 py-4 border-2 border-green-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-600 text-lg transition bg-gray-900/80 placeholder-green-700 text-green-200 shadow"
          placeholder="Type syllabus..."
          value={syllabus}
          onChange={e => setSyllabus(e.target.value)}
          disabled={plan}
        />
        <div className="flex w-full gap-3">
          <button
            className="flex-1 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white font-bold py-3 rounded-xl text-lg shadow-lg transition disabled:opacity-60"
            onClick={handleGenerate}
            disabled={genLoading || !syllabus.trim() || plan}
          >
            {genLoading ? (
              <span className="flex items-center justify-center gap-2"><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>Generating...</span>
            ) : 'Create Plan'}
          </button>
          <button
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-green-300 font-bold py-3 rounded-xl text-lg shadow-lg transition disabled:opacity-60 border border-green-700"
            onClick={handleNewPlan}
            disabled={genLoading && !plan && !syllabus}
          >New Study Plan</button>
        </div>
      </div>
      {/* Display generated plan and quizzes */}
      {plan && (
        <div className="max-w-2xl mx-auto mb-8 p-8 bg-green-950/90 rounded-3xl shadow-xl flex flex-col gap-4 border border-green-800">
          <h2 className="text-2xl font-bold text-green-300 mb-2">Study Plan</h2>
          <p className="text-green-100 whitespace-pre-line text-lg">{plan}</p>
          <button
            className="self-end bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white px-6 py-2 rounded-xl font-semibold mt-2 shadow border border-green-700"
            onClick={handleSave}
            disabled={submitted}
          >Save Plan & Quizzes</button>
        </div>
      )}
      {generatedQuizzes.length > 0 && (
        <div className="max-w-2xl mx-auto mb-8 p-8 bg-gray-900/90 rounded-3xl shadow-xl flex flex-col gap-8 border border-green-900">
          <h2 className="text-xl font-bold text-green-400 mb-2">Top 10 Quizzes</h2>
          {generatedQuizzes.map((q, idx) => (
            <div key={idx} className="mb-4 p-5 bg-green-950/80 rounded-2xl shadow flex flex-col gap-3 border border-green-900">
              <div className="font-semibold text-green-200 mb-1 text-lg">{idx + 1}. {q.question}</div>
              <div className="flex flex-col gap-2">
                {q.options.map((opt, i) => (
                  <label key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition border-2 ${userAnswers[idx] === i ? 'border-green-500 bg-green-900/60' : 'border-transparent hover:border-green-800'}` }>
                    <input
                      type="radio"
                      name={`quiz-${idx}`}
                      value={i}
                      checked={userAnswers[idx] === i}
                      onChange={() => handleOptionChange(idx, i)}
                      disabled={checked[idx] || submitted}
                      className="accent-green-500 w-5 h-5"
                    />
                    <span className="text-green-100 text-base">{opt}</span>
                  </label>
                ))}
              </div>
              {!submitted && (
                <button
                  className="mt-2 w-max bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-lg font-semibold shadow disabled:opacity-60"
                  onClick={() => handleCheck(idx)}
                  disabled={checked[idx] || userAnswers[idx] == null}
                >Check</button>
              )}
              {checked[idx] && !submitted && (
                <div className={`mt-2 text-lg font-bold flex items-center gap-2 ${feedback[idx] ? 'text-green-400' : 'text-red-400'}` }>
                  {feedback[idx] ? (
                    <>
                      <span className="inline-block w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white">✓</span>
                      Correct!
                    </>
                  ) : (
                    <>
                      <span className="inline-block w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">✗</span>
                      Incorrect. Correct answer: <span className="ml-1 font-mono text-green-200">{q.answer}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {/* Submit All Button */}
          {!submitted && (
            <button
              className="w-full mt-4 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white font-bold py-3 rounded-xl text-lg shadow-lg transition disabled:opacity-60 border border-green-700"
              onClick={handleSubmitAll}
              disabled={userAnswers.some(ans => ans == null)}
            >Submit All</button>
          )}
          {/* Result Summary */}
          {submitted && result && (
            <div className="mt-8 p-6 bg-green-900/80 rounded-2xl shadow flex flex-col items-center gap-2 border border-green-800">
              <h3 className="text-2xl font-bold text-green-300 mb-2">Quiz Result</h3>
              <div className="text-lg text-green-200">Correct: <span className="font-bold text-green-400">{result.correct}</span></div>
              <div className="text-lg text-green-200">Incorrect: <span className="font-bold text-red-400">{result.incorrect}</span></div>
              <div className="text-lg text-green-200">Score: <span className="font-bold text-green-400">{result.percent}%</span></div>
              <button
                className="mt-4 bg-gray-800 hover:bg-gray-700 text-green-300 font-bold px-6 py-2 rounded-xl text-lg shadow border border-green-700"
                onClick={handleNewPlan}
              >New Study Plan</button>
            </div>
          )}
        </div>
      )}
      {
        loading ? <div className='text-center min-h-[90vh] flex items-center justify-center text-xl'>Loading...</div>
          : !loading && quizzes?.length > 0
            ? <div className='grid grid-cols-1 md:grid-cols-2 gap-3 lg:grid-cols-3'>
              {
                quizzes.map((quiz, index) => (
                  <QuizCard key={quiz._id} quiz={quiz} index={index} />
                ))
              }
            </div>
            : <p>No quizzes found</p>
      }
    </section>
  )
}

export default Home