import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Settings, CheckCircle, Circle, 
  Plus, Volume2, VolumeX, FileText, CheckSquare, Award, 
  ChevronDown, ChevronUp, Trash2, ShoppingBag, ChevronLeft, ChevronRight
} from 'lucide-react';

// --- TONE.JS AMBIENT NOISE (Synthetic) ---
let audioCtx;
let noiseNode;
let filterNode;
let gainNode;

const toggleAmbientNoise = (play) => {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; 
    }

    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;

    filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = 400;

    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;

    noiseNode.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    noiseNode.start();
  }

  if (play) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    gainNode.gain.setTargetAtTime(0.5, audioCtx.currentTime, 0.5);
  } else {
    if (gainNode) gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
  }
};

// --- CONSTANTS & MOCK DATA ---
const MODES = { POMODORO: 'pomodoro', SHORT_BREAK: 'shortBreak', LONG_BREAK: 'longBreak' };
const DEFAULT_SETTINGS = { pomodoro: 25, shortBreak: 5, longBreak: 15 };

const SHOP_ITEMS = [
  { id: 'plant', name: 'Potted Plant', price: 50, icon: '🪴', desc: 'A little green friend' },
  { id: 'lamp', name: 'Cozy Lamp', price: 75, icon: '🏮', desc: 'Lights up your path' },
  { id: 'bench', name: 'Park Bench', price: 100, icon: '🪑', desc: 'Take a seat' },
  { id: 'tree', name: 'Apple Tree', price: 150, icon: '🌳', desc: 'Provides fresh air' },
  { id: 'house', name: 'Small Cottage', price: 300, icon: '🏡', desc: 'A place to rest' },
  { id: 'cafe', name: 'Cat Cafe', price: 500, icon: '🏪', desc: 'Coffee & cats!' },
  { id: 'castle', name: 'Cloud Castle', price: 1000, icon: '🏰', desc: 'Ultimate focus goal' },
];

export default function App() {
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'notes', 'shop', 'settings'
  const [noiseActive, setNoiseActive] = useState(false);
  
  // User Data
  const [notes, setNotes] = useState('');
  const [coins, setCoins] = useState(150); // Start with some coins for demo
  const [purchasedItems, setPurchasedItems] = useState([SHOP_ITEMS[0]]); // Start with a plant

  // Timer State
  const [mode, setMode] = useState(MODES.POMODORO);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.pomodoro * 60);
  const [isActive, setIsActive] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Task State
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Complete wireframes', priority: 'High', completed: false, focusTime: 25, subtasks: [{ id: 101, title: 'Login page', completed: true }] },
    { id: 2, title: 'Read Chapter 4', priority: 'Medium', completed: false, focusTime: 0, subtasks: [] },
  ]);
  const [activeTaskId, setActiveTaskId] = useState(null);

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((timeLeft) => timeLeft - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (!isActive) setTimeLeft(settings[mode] * 60);
  }, [mode, settings]);

  const handleTimerComplete = () => {
    setIsActive(false);
    
    // Reward System & Task tracking
    if (mode === MODES.POMODORO) {
      setCoins(c => c + 50); // Reward for completing focus
      if (activeTaskId) {
        setTasks(tasks.map(t => t.id === activeTaskId ? { ...t, focusTime: t.focusTime + settings.pomodoro } : t));
      }
      setMode(MODES.SHORT_BREAK); // Auto-switch to short break
    } else {
      setMode(MODES.POMODORO); // Back to Pomodoro after break
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setTimeLeft(settings[mode] * 60); };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- ACTIONS ---
  const toggleNoise = () => {
    const newState = !noiseActive;
    setNoiseActive(newState);
    toggleAmbientNoise(newState);
  };

  const buyItem = (item) => {
    if (coins >= item.price) {
      setCoins(coins - item.price);
      setPurchasedItems([...purchasedItems, item]);
    }
  };

  const addTask = (title) => {
    if (!title.trim()) return;
    setTasks([...tasks, { id: Date.now(), title, priority: 'Low', completed: false, focusTime: 0, subtasks: [] }]);
  };
  const toggleTask = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id) => { setTasks(tasks.filter(t => t.id !== id)); if (activeTaskId === id) setActiveTaskId(null); };
  const addSubtask = (taskId, title) => {
    if (!title.trim()) return;
    setTasks(tasks.map(t => t.id === taskId ? { ...t, subtasks: [...t.subtasks, { id: Date.now(), title, completed: false }] } : t));
  };
  const toggleSubtask = (taskId, subtaskId) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, subtasks: t.subtasks.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st) } : t));
  };
  const changeTaskPriority = (id, priority) => setTasks(tasks.map(t => t.id === id ? { ...t, priority } : t));

  return (
    <div className="h-screen w-screen relative flex overflow-hidden font-sans bg-[#2a1b3d] text-white">
      
      {/* --- DYNAMIC COSY BACKGROUND (CITY BUILDER) --- */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#2a1b3d] via-[#44315f] to-[#1e3c54] overflow-hidden pointer-events-none">
        {/* Sky Elements */}
        <div className="absolute top-12 left-[30%] w-1.5 h-1.5 bg-white rounded-full opacity-60 shadow-[0_0_12px_white]"></div>
        <div className="absolute top-24 right-[40%] w-1 h-1 bg-white rounded-full opacity-40 shadow-[0_0_8px_white]"></div>
        <div className="absolute top-16 right-[15%] w-28 h-28 bg-orange-200/90 rounded-full shadow-[0_0_60px_rgba(253,186,116,0.5)]"></div>
        
        {/* Landscape */}
        <div className="absolute bottom-[18%] -left-[10%] w-[65%] h-[40%] bg-[#2a455a] rounded-[100%] opacity-80"></div>
        <div className="absolute bottom-[12%] -right-[15%] w-[75%] h-[50%] bg-[#1f3a4d] rounded-[100%] opacity-90"></div>
        
        {/* Ground & City Items */}
        <div className="absolute bottom-0 w-full h-[25%] bg-gradient-to-t from-[#0f241a] to-[#1b3b2b] border-t-[3px] border-[#2b593f] pointer-events-auto">
          <div className="w-full h-full flex items-end px-12 pb-6 gap-6 overflow-x-auto custom-scrollbar relative z-10">
            {purchasedItems.length === 0 && (
              <p className="text-white/40 text-sm absolute top-4 w-full text-center">Your city is empty. Complete sessions to earn coins and build!</p>
            )}
            {purchasedItems.map((item, idx) => (
              <div 
                key={idx} 
                className="city-item text-6xl lg:text-7xl drop-shadow-xl transform hover:scale-110 hover:-translate-y-2 transition-transform cursor-pointer origin-bottom flex-shrink-0"
                title={item.name}
              >
                {item.icon}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- COLLAPSIBLE SIDEBAR --- */}
      <div className={`relative z-20 h-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
        <div className="absolute inset-0 w-80 flex flex-col bg-black/40 backdrop-blur-2xl border-r border-white/10 shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">sessions</h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mt-1">Workspace</p>
            </div>
            <div className="flex items-center space-x-1 bg-white/10 px-3 py-1.5 rounded-full text-yellow-300 text-sm font-semibold shadow-inner">
              <Award size={16} className="mr-1" /> {coins}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex p-3 gap-2 bg-black/20 shrink-0">
            <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={16}/>} label="Tasks" />
            <TabButton active={activeTab === 'shop'} onClick={() => setActiveTab('shop')} icon={<ShoppingBag size={16}/>} label="Shop" />
            <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} icon={<FileText size={16}/>} label="Notes" />
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <TaskInput onAdd={addTask} />
                <div className="space-y-3 mt-4">
                  {tasks.map(task => (
                    <TaskItem 
                      key={task.id} task={task} isActive={activeTaskId === task.id}
                      onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)}
                      onAddSubtask={(title) => addSubtask(task.id, title)} onToggleSubtask={(stId) => toggleSubtask(task.id, stId)}
                      onChangePriority={(p) => changeTaskPriority(task.id, p)} onSelect={() => setActiveTaskId(task.id === activeTaskId ? null : task.id)}
                    />
                  ))}
                  {tasks.length === 0 && <p className="text-center text-gray-400 text-sm mt-8">All caught up! Time to chill or add new tasks.</p>}
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <textarea 
                className="w-full h-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none shadow-inner"
                placeholder="Jot down random thoughts, ideas, or distractions here..."
                value={notes} onChange={(e) => setNotes(e.target.value)}
              />
            )}

            {activeTab === 'shop' && (
              <div className="space-y-3">
                <div className="bg-purple-900/40 border border-purple-500/30 rounded-xl p-3 mb-4 text-center">
                  <p className="text-xs text-purple-200">Spend Focus Coins to decorate your cozy space!</p>
                </div>
                {SHOP_ITEMS.map(item => (
                  <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{item.icon}</div>
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => buyItem(item)}
                      disabled={coins < item.price}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${coins >= item.price ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/40 border border-yellow-500/30' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                    >
                      {item.price} 🪙
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-white/10 flex justify-between shrink-0 bg-black/20">
            <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-full transition-colors ${activeTab === 'settings' ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-400'}`}>
              <Settings size={20} />
            </button>
            <button onClick={toggleNoise} className={`p-2 rounded-full transition-colors ${noiseActive ? 'bg-purple-500/80 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'hover:bg-white/10 text-gray-400'}`} title="Toggle Ambient Rain">
              {noiseActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button (Floats next to sidebar) */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute z-30 top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out bg-white/10 hover:bg-white/20 p-1.5 py-4 rounded-r-xl border border-l-0 border-white/10 backdrop-blur-md shadow-xl text-gray-300 hover:text-white"
        style={{ left: isSidebarOpen ? '20rem' : '0' }}
      >
        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* --- MAIN CONTENT (TIMER) --- */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-8 pb-32">
        {/* Main Glass Panel */}
        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center w-full max-w-lg shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all">
          
          {/* Active Task Banner */}
          <div className="mb-8 text-center h-8 transition-opacity">
            {activeTaskId ? (
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-black/40 border border-white/10 text-sm text-gray-200 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                Focusing on: <span className="font-semibold ml-1 truncate max-w-[200px]">{tasks.find(t=>t.id === activeTaskId)?.title}</span>
              </div>
            ) : (
              <p className="text-gray-300/60 text-sm bg-black/20 px-4 py-1.5 rounded-full border border-white/5">Select a task from the sidebar to focus on.</p>
            )}
          </div>

          {/* Mode Selector */}
          <div className="flex space-x-2 bg-black/40 p-1.5 rounded-full mb-8 shadow-inner border border-white/5">
            <ModeButton active={mode === MODES.POMODORO} onClick={() => setMode(MODES.POMODORO)}>Focus</ModeButton>
            <ModeButton active={mode === MODES.SHORT_BREAK} onClick={() => setMode(MODES.SHORT_BREAK)}>Short Break</ModeButton>
            <ModeButton active={mode === MODES.LONG_BREAK} onClick={() => setMode(MODES.LONG_BREAK)}>Long Break</ModeButton>
          </div>

          {/* Timer Display */}
          <div className="text-[8rem] font-bold text-white tracking-tighter leading-none mb-8 drop-shadow-2xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(timeLeft)}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-6">
            <button 
              onClick={toggleTimer}
              className="bg-white text-black hover:bg-gray-200 transition-all px-12 py-4 rounded-full font-bold text-xl flex items-center shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transform hover:scale-105 active:scale-95"
            >
              {isActive ? <Pause className="mr-2" fill="currentColor" /> : <Play className="mr-2" fill="currentColor" />}
              {isActive ? 'Pause' : 'Start'}
            </button>
            <button onClick={resetTimer} className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all transform hover:rotate-180 duration-500 border border-white/10">
              <RotateCcw size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* --- SETTINGS OVERLAY --- */}
      {activeTab === 'settings' && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-lg font-bold text-white">Timer Settings</h2>
              <button onClick={() => setActiveTab('tasks')} className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <SettingInput label="Focus" value={settings.pomodoro} onChange={(v) => setSettings({...settings, pomodoro: v})} />
                <SettingInput label="Short Break" value={settings.shortBreak} onChange={(v) => setSettings({...settings, shortBreak: v})} />
                <SettingInput label="Long Break" value={settings.longBreak} onChange={(v) => setSettings({...settings, longBreak: v})} />
              </div>
              <button onClick={() => setActiveTab('tasks')} className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-bold shadow-lg transition-colors">
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        
        @keyframes dropIn {
          0% { transform: translateY(-30px) scale(0.8); opacity: 0; }
          60% { transform: translateY(5px) scale(1.05); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .city-item { animation: dropIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
      `}} />
    </div>
  );
}

// --- SUBCOMPONENTS ---

function TabButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
        active ? 'bg-white/20 text-white shadow-sm' : 'hover:bg-white/10 text-gray-400 hover:text-gray-200'
      }`}
    >
      <span className="mr-1.5 opacity-80">{icon}</span> {label}
    </button>
  );
}

function ModeButton({ active, onClick, children }) {
  return (
    <button 
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
        active ? 'bg-purple-500/80 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'text-gray-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function SettingInput({ label, value, onChange }) {
  return (
    <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-center shadow-inner">
      <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">{label}</label>
      <input 
        type="number" value={value} min="1"
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        className="w-full bg-transparent text-white font-bold text-2xl text-center focus:outline-none"
      />
      <span className="text-[10px] text-gray-500 mt-1 block">minutes</span>
    </div>
  );
}

function TaskInput({ onAdd }) {
  const [val, setVal] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onAdd(val); setVal(''); }} className="flex items-center bg-white/10 rounded-xl px-3 py-2 border border-white/10 focus-within:border-purple-400 transition-colors shadow-inner">
      <Plus size={18} className="text-purple-300 mr-2" />
      <input type="text" placeholder="Add a new task..." value={val} onChange={(e) => setVal(e.target.value)} className="bg-transparent text-sm text-white w-full focus:outline-none placeholder-gray-400" />
    </form>
  );
}

function TaskItem({ task, isActive, onToggle, onDelete, onAddSubtask, onToggleSubtask, onChangePriority, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');

  const priorityColors = {
    'High': 'text-red-300 bg-red-400/10 border-red-400/20',
    'Medium': 'text-yellow-300 bg-yellow-400/10 border-yellow-400/20',
    'Low': 'text-blue-300 bg-blue-400/10 border-blue-400/20'
  };

  return (
    <div className={`bg-white/5 rounded-xl border transition-all ${isActive ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-white/5 hover:border-white/20'}`}>
      <div className="p-3 flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 flex-shrink-0">
          {task.completed ? <CheckCircle size={18} className="text-green-400" /> : <Circle size={18} className="text-gray-500 hover:text-white" />}
        </button>
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <p className={`text-sm font-medium truncate ${task.completed ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${priorityColors[task.priority]}`}>{task.priority}</span>
            {task.focusTime > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-200 border border-purple-500/30">{task.focusTime}m focused</span>}
            {task.subtasks.length > 0 && (
              <span className="text-[10px] text-gray-400 flex items-center bg-white/5 px-1.5 py-0.5 rounded-md">
                <CheckSquare size={10} className="mr-1" /> {task.subtasks.filter(s=>s.completed).length}/{task.subtasks.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 items-center">
          <button onClick={onSelect} className={`text-xs px-2 py-1 rounded transition-colors font-medium border ${isActive ? 'bg-purple-500/30 text-purple-200 border-purple-500/50' : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'}`}>
            {isActive ? 'Active' : 'Focus'}
          </button>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-white/5 bg-black/30 rounded-b-xl shadow-inner">
          <div className="flex justify-between items-center mb-3">
             <div className="flex space-x-1">
               {['Low', 'Medium', 'High'].map(p => (
                 <button key={p} onClick={() => onChangePriority(p)} className={`text-[10px] px-2 py-1 rounded border transition-colors ${task.priority === p ? priorityColors[p] : 'text-gray-500 border-white/10 hover:text-gray-300'}`}>
                   {p}
                 </button>
               ))}
             </div>
             <button onClick={onDelete} className="text-red-400/60 hover:text-red-400 p-1 bg-red-400/10 rounded"><Trash2 size={12} /></button>
          </div>
          <div className="space-y-2 mb-3">
            {task.subtasks.map(st => (
              <div key={st.id} className="flex items-center gap-2">
                <button onClick={() => onToggleSubtask(st.id)}>
                  {st.completed ? <CheckCircle size={14} className="text-green-500/70" /> : <Circle size={14} className="text-gray-500" />}
                </button>
                <span className={`text-xs ${st.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{st.title}</span>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onAddSubtask(newSubtask); setNewSubtask(''); }} className="flex items-center bg-white/5 rounded-lg px-2 py-1.5 border border-white/5">
            <Plus size={12} className="text-gray-400 mr-2" />
            <input type="text" placeholder="Add subtask..." value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} className="bg-transparent text-xs text-white w-full focus:outline-none" />
          </form>
        </div>
      )}
    </div>
  );
}