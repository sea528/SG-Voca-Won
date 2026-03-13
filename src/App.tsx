/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc,
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  BookOpen, 
  Plus, 
  LogOut, 
  GraduationCap, 
  User as UserIcon, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  BarChart3,
  Trophy,
  ArrowLeft,
  Trash2,
  FileText,
  Edit2,
  Upload,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

// --- Types ---

interface Word {
  word: string;
  meaning: string;
}

interface WordSet {
  id: string;
  title: string;
  teacherId: string;
  words: Word[];
  createdAt: any;
}

interface QuizResult {
  id: string;
  studentId: string;
  studentName: string;
  wordSetId: string;
  wordSetTitle: string;
  score: number;
  total: number;
  timestamp: any;
}

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
}

// --- Components ---

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-stone-50">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
    />
  </div>
);

const Navbar = ({ user, profile, onLogout }: { user: FirebaseUser, profile: UserProfile | null, onLogout: () => void }) => (
  <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
    <div className="flex items-center gap-2">
      <div className="bg-emerald-600 p-2 rounded-lg">
        <BookOpen className="text-white w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-stone-900 tracking-tight">VocaMaster</h1>
    </div>
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-sm font-medium text-stone-900">{user.displayName}</span>
        <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold">
          {profile?.role === 'teacher' ? '교사' : '학생'}
        </span>
      </div>
      <button 
        onClick={onLogout}
        className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500"
        title="로그아웃"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  </nav>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'form' | 'quiz' | 'results'>('dashboard');
  const [selectedSet, setSelectedSet] = useState<WordSet | null>(null);
  const [editingSet, setEditingSet] = useState<WordSet | null>(null);
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'wordSets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WordSet));
      setWordSets(sets);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'results'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const res = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizResult));
      setResults(res);
    });
    return unsubscribe;
  }, [user]);

  const handleLogin = async (role: 'teacher' | 'student') => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      let userProfile: UserProfile;
      if (!docSnap.exists()) {
        userProfile = {
          uid: user.uid,
          email: user.email!,
          name: user.displayName!,
          role
        };
        await setDoc(docRef, userProfile);
      } else {
        userProfile = docSnap.data() as UserProfile;
      }
      setProfile(userProfile);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) return <LoadingScreen />;

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-8 border border-stone-100"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
              <BookOpen className="text-emerald-600 w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">VocaMaster</h1>
            <p className="text-stone-500">영어 단어 학습의 시작, 보카마스터</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => handleLogin('teacher')}
              className="w-full flex items-center justify-between p-5 bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-200 rounded-2xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-stone-900">교사로 시작하기</div>
                  <div className="text-sm text-stone-500">단어장 제작 및 학습 관리</div>
                </div>
              </div>
              <ChevronRight className="text-stone-300 group-hover:text-emerald-400 transition-colors" />
            </button>

            <button 
              onClick={() => handleLogin('student')}
              className="w-full flex items-center justify-between p-5 bg-stone-50 hover:bg-blue-50 border border-stone-200 hover:border-blue-200 rounded-2xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-stone-900">학생으로 시작하기</div>
                  <div className="text-sm text-stone-500">퀴즈 풀기 및 성적 확인</div>
                </div>
              </div>
              <ChevronRight className="text-stone-300 group-hover:text-blue-400 transition-colors" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <Navbar user={user} profile={profile} onLogout={handleLogout} />
      
      <main className="max-w-5xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <Dashboard 
              profile={profile} 
              wordSets={wordSets} 
              results={results}
              onAdd={() => { setEditingSet(null); setView('form'); }} 
              onEdit={(set: WordSet) => { setEditingSet(set); setView('form'); }}
              onQuiz={(set: WordSet) => { setSelectedSet(set); setView('quiz'); }}
              onViewResults={(set: WordSet) => { setSelectedSet(set); setView('results'); }}
            />
          )}
          {view === 'form' && (
            <WordSetForm 
              userId={user.uid} 
              editingSet={editingSet}
              onBack={() => setView('dashboard')} 
            />
          )}
          {view === 'quiz' && selectedSet && (
            <Quiz 
              wordSet={selectedSet} 
              profile={profile}
              onComplete={() => setView('dashboard')}
              onBack={() => setView('dashboard')}
            />
          )}
          {view === 'results' && selectedSet && (
            <ResultsView 
              wordSet={selectedSet} 
              results={results.filter(r => r.wordSetId === selectedSet.id)}
              onBack={() => setView('dashboard')}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Dashboard Component ---

function Dashboard({ profile, wordSets, results, onAdd, onEdit, onQuiz, onViewResults }: any) {
  const isTeacher = profile.role === 'teacher';
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">안녕하세요, {profile.name}님!</h2>
          <p className="text-stone-500">{isTeacher ? '오늘의 단어장을 관리해보세요.' : '오늘의 퀴즈에 도전해보세요.'}</p>
        </div>
        {isTeacher && (
          <button 
            onClick={onAdd}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200"
          >
            <Plus className="w-5 h-5" />
            단어장 만들기
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            단어장 목록
          </h3>
          <div className="space-y-3">
            {wordSets.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center">
                <p className="text-stone-400">등록된 단어장이 없습니다.</p>
              </div>
            ) : (
              wordSets.map((set: WordSet) => (
                <motion.div 
                  key={set.id}
                  whileHover={{ y: -2 }}
                  className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-stone-900">{set.title}</div>
                      <div className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
                        단어 {set.words.length}개
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTeacher ? (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => onEdit(set)}
                          className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-emerald-600 transition-all"
                          title="수정하기"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => onViewResults(set)}
                          className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-900 transition-all"
                          title="결과 보기"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => onQuiz(set)}
                        className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        퀴즈 시작
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            {isTeacher ? '최근 학습 현황' : '나의 학습 기록'}
          </h3>
          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-100 grid grid-cols-3 text-xs font-bold text-stone-400 uppercase tracking-widest">
              <span>{isTeacher ? '학생' : '단어장'}</span>
              <span className="text-center">점수</span>
              <span className="text-right">날짜</span>
            </div>
            <div className="divide-y divide-stone-50 max-h-[400px] overflow-y-auto">
              {(isTeacher ? results : results.filter((r: any) => r.studentId === profile.uid)).length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-sm">기록이 없습니다.</div>
              ) : (
                (isTeacher ? results : results.filter((r: any) => r.studentId === profile.uid)).map((res: QuizResult) => (
                  <div key={res.id} className="p-4 grid grid-cols-3 items-center text-sm">
                    <span className="font-semibold text-stone-900 truncate">
                      {isTeacher ? res.studentName : res.wordSetTitle}
                    </span>
                    <span className="text-center">
                      <span className="font-bold text-emerald-600">{res.score}</span>
                      <span className="text-stone-300 mx-1">/</span>
                      <span className="text-stone-500">{res.total}</span>
                    </span>
                    <span className="text-right text-stone-400 text-xs">
                      {res.timestamp?.toDate ? res.timestamp.toDate().toLocaleDateString() : '방금 전'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

// --- WordSet Form Component (Create/Edit) ---

function WordSetForm({ userId, editingSet, onBack }: any) {
  const [title, setTitle] = useState(editingSet?.title || '');
  const [words, setWords] = useState<Word[]>(editingSet?.words || [{ word: '', meaning: '' }]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addWord = () => setWords([...words, { word: '', meaning: '' }]);
  const removeWord = (index: number) => setWords(words.filter((_, i) => i !== index));
  const updateWord = (index: number, field: keyof Word, value: string) => {
    const newWords = [...words];
    newWords[index][field] = value;
    setWords(newWords);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        // Assume format: Column A = Word, Column B = Meaning
        const importedWords: Word[] = data
          .filter(row => row && row.length >= 2 && row[0] && row[1])
          .map(row => ({
            word: String(row[0]).trim(),
            meaning: String(row[1]).trim()
          }))
          .filter(w => !['word', 'meaning', '단어', '뜻'].includes(w.word.toLowerCase()));

        if (importedWords.length > 0) {
          // If the first row is empty, replace it, otherwise append
          setWords(prev => {
            if (prev.length === 1 && !prev[0].word && !prev[0].meaning) {
              return importedWords;
            }
            return [...prev, ...importedWords];
          });
        }
      } catch (err) {
        console.error("Excel parsing error", err);
        alert("엑셀 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    // Filter out empty rows before validation
    const validWords = words.filter(w => w.word.trim() !== '' && w.meaning.trim() !== '');

    if (!title.trim()) {
      alert("단어장 제목을 입력해주세요.");
      return;
    }

    if (validWords.length === 0) {
      alert("최소 하나 이상의 단어를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // Ensure plain objects for Firestore and clean data
      const wordsToSave = validWords.map(w => ({
        word: w.word.trim(),
        meaning: w.meaning.trim()
      }));

      if (editingSet) {
        await updateDoc(doc(db, 'wordSets', editingSet.id), {
          title: title.trim(),
          words: wordsToSave,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'wordSets'), {
          title: title.trim(),
          teacherId: userId,
          words: wordsToSave,
          createdAt: serverTimestamp()
        });
      }
      onBack();
    } catch (error: any) {
      console.error("Save failed", error);
      alert("저장 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Word', 'Meaning'],
      ['apple', '사과'],
      ['banana', '바나나'],
      ['computer', '컴퓨터']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, "voca_sample.xlsx");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-stone-900">
            {editingSet ? '단어장 수정하기' : '새 단어장 만들기'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={downloadSample}
            className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            샘플 양식
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <Upload className="w-4 h-4" />
            엑셀 업로드
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-stone-400 uppercase tracking-widest">단어장 제목</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 중학 필수 영단어 100"
            className="w-full text-xl font-bold p-4 bg-stone-50 border border-stone-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-stone-400 uppercase tracking-widest block">단어 목록 ({words.length})</label>
            {words.length > 0 && (
              <button 
                onClick={() => setWords([{ word: '', meaning: '' }])}
                className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest"
              >
                전체 삭제
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {words.map((word, index) => (
              <div key={index} className="flex gap-3 items-center">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    value={word.word}
                    onChange={(e) => updateWord(index, 'word', e.target.value)}
                    placeholder="단어 (English)"
                    className="p-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  />
                  <input 
                    type="text" 
                    value={word.meaning}
                    onChange={(e) => updateWord(index, 'meaning', e.target.value)}
                    placeholder="뜻 (Korean)"
                    className="p-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  />
                </div>
                <button 
                  onClick={() => removeWord(index)}
                  className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <button 
            onClick={addWord}
            className="w-full py-4 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 font-bold hover:bg-stone-50 hover:border-stone-300 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            단어 직접 추가
          </button>
        </div>

        <div className="pt-6 border-t border-stone-50 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200"
          >
            {loading ? '저장 중...' : editingSet ? '수정사항 저장하기' : '단어장 저장하기'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- Quiz Component ---

function Quiz({ wordSet, profile, onComplete, onBack }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentWord = wordSet.words[currentIndex];

  useEffect(() => {
    if (currentIndex < wordSet.words.length) {
      const correct = currentWord.word;
      const others = wordSet.words
        .filter((w: Word) => w.word !== correct)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((w: Word) => w.word);
      
      const allOptions = [correct, ...others].sort(() => 0.5 - Math.random());
      setOptions(allOptions);
      setSelectedOption(null);
    } else {
      setShowResult(true);
    }
  }, [currentIndex, wordSet.words]);

  const handleOptionClick = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    const correct = option === currentWord.word;
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      setCurrentIndex(i => i + 1);
    }, 1200);
  };

  const saveResult = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'results'), {
        studentId: profile.uid,
        studentName: profile.name,
        wordSetId: wordSet.id,
        wordSetTitle: wordSet.title,
        score,
        total: wordSet.words.length,
        timestamp: serverTimestamp()
      });
      onComplete();
    } catch (error) {
      console.error("Result save failed", error);
    } finally {
      setLoading(false);
    }
  };

  if (showResult) {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md mx-auto bg-white p-10 rounded-[40px] shadow-2xl shadow-stone-200/50 text-center space-y-8"
      >
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <Trophy className="w-16 h-16 text-emerald-600" />
          </div>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="absolute -top-2 -right-2 bg-amber-400 text-white p-2 rounded-full shadow-lg"
          >
            <CheckCircle2 className="w-6 h-6" />
          </motion.div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-stone-900 mb-2">학습 완료!</h2>
          <p className="text-stone-500">정말 잘하셨어요. 결과를 확인해보세요.</p>
        </div>

        <div className="bg-stone-50 p-6 rounded-3xl">
          <div className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-1">최종 점수</div>
          <div className="text-5xl font-black text-stone-900">
            {score} <span className="text-stone-300 text-3xl">/</span> {wordSet.words.length}
          </div>
        </div>

        <button 
          onClick={saveResult}
          disabled={loading}
          className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 text-white py-5 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-stone-200"
        >
          {loading ? '기록 중...' : '결과 저장하고 나가기'}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-400 hover:text-stone-900 font-bold transition-colors">
          <ArrowLeft className="w-5 h-5" />
          나가기
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-emerald-600 font-bold">
            <CheckCircle2 className="w-4 h-4" /> {score}
          </div>
          <div className="flex items-center gap-1 text-red-400 font-bold">
            <XCircle className="w-4 h-4" /> {currentIndex - score}
          </div>
          <div className="text-stone-400 font-mono text-sm">
            {currentIndex + 1} / {wordSet.words.length}
          </div>
        </div>
      </div>

      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
        <motion.div 
          className="bg-emerald-500 h-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / wordSet.words.length) * 100}%` }}
        />
      </div>

      <motion.div 
        key={currentIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-12 rounded-[40px] shadow-xl shadow-stone-100 border border-stone-100 text-center space-y-12"
      >
        <div className="space-y-2">
          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">뜻을 보고 단어를 고르세요</span>
          <h3 className="text-4xl font-black text-stone-900 leading-tight">
            {currentWord?.meaning}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option === currentWord?.word;
            
            let bgColor = "bg-stone-50 hover:bg-stone-100 border-stone-100";
            let textColor = "text-stone-700";
            
            if (selectedOption) {
              if (isCorrectOption) {
                bgColor = "bg-emerald-500 border-emerald-500";
                textColor = "text-white";
              } else if (isSelected) {
                bgColor = "bg-red-500 border-red-500";
                textColor = "text-white";
              } else {
                bgColor = "bg-stone-50 border-stone-50 opacity-50";
              }
            }

            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleOptionClick(option)}
                className={`p-6 rounded-2xl border-2 font-bold text-lg transition-all ${bgColor} ${textColor} flex items-center justify-center gap-3`}
              >
                {option}
                {selectedOption && isCorrectOption && <CheckCircle2 className="w-5 h-5" />}
                {selectedOption && isSelected && !isCorrectOption && <XCircle className="w-5 h-5" />}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// --- Results View Component (Teacher) ---

function ResultsView({ wordSet, results, onBack }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">{wordSet.title}</h2>
          <p className="text-stone-500">학생별 학습 결과 리포트</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-stone-50 text-xs font-bold text-stone-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">학생 이름</th>
              <th className="px-6 py-4 text-center">점수</th>
              <th className="px-6 py-4 text-center">정답률</th>
              <th className="px-6 py-4 text-right">제출 시간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {results.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-stone-400">아직 제출된 결과가 없습니다.</td>
              </tr>
            ) : (
              results.map((res: QuizResult) => (
                <tr key={res.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-900">{res.studentName}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-emerald-600">{res.score}</span>
                    <span className="text-stone-300 mx-1">/</span>
                    <span className="text-stone-500">{res.total}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black">
                      {Math.round((res.score / res.total) * 100)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-stone-400 text-sm">
                    {res.timestamp?.toDate ? res.timestamp.toDate().toLocaleString() : '방금 전'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
