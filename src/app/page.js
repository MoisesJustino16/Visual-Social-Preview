'use client';

import React, { useState, useRef, useEffect } from 'react';
// USANDO IMPORTAÇÃO VIA WEB PARA FUNCIONAR AQUI NA PREVIEW.
// No seu computador, se tiver instalado 'npm install @supabase/supabase-js', 
// você pode trocar por: import { createClient } from '@supabase/supabase-js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js'; 
import { 
  Upload, Heart, MessageCircle, Send, MoreHorizontal, Music2, 
  ArrowLeft, Link as LinkIcon, CheckCircle, Bookmark, XCircle, 
  Share2, Copy, Layout, Plus, RefreshCw, Smartphone, ChevronLeft, X, AlertTriangle, User, Hash, BarChart3
} from 'lucide-react';

// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Inicialização segura
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-a-selfie-in-a-field-of-flowers-3444-large.mp4";

export default function App() {
  // --- ESTADOS DE NAVEGAÇÃO ---
  const [isClientView, setIsClientView] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); 
  const [projects, setProjects] = useState([]); 

  // --- DADOS DO POST ---
  const [postId, setPostId] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [platform, setPlatform] = useState('story'); 
  const [mediaType, setMediaType] = useState('video'); 
  const [status, setStatus] = useState('pending'); 
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  const [caption, setCaption] = useState("Confira as novidades da semana! #THAU");
  
  // --- PERSONALIZAÇÃO DO PERFIL (NOVOS CAMPOS) ---
  const [profileName, setProfileName] = useState('thau.preview');
  const [statLikes, setStatLikes] = useState('12.4k');
  const [statComments, setStatComments] = useState('342');
  
  // --- INTERATIVIDADE ---
  const [comments, setComments] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tempPin, setTempPin] = useState(null); 
  const [newCommentText, setNewCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);

  // --- 1. INICIALIZAÇÃO ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const idFromUrl = params.get('id');

      if (idFromUrl) {
        setIsClientView(true);
        setPostId(idFromUrl);
        loadProject(idFromUrl);
      } else {
        if (supabase) fetchProjects();
      }
    }
  }, []);

  // --- 2. FUNÇÕES DE DADOS ---

  // Helper para esconder/ler dados extras na legenda (Truque para não precisar alterar o banco de dados agora)
  const packMetadata = (text, meta) => `${text}|||${JSON.stringify(meta)}`;
  const unpackMetadata = (fullText) => {
    if (!fullText) return { text: "", meta: {} };
    const parts = fullText.split('|||');
    if (parts.length > 1) {
        try {
            return { text: parts[0], meta: JSON.parse(parts[1]) };
        } catch (e) { return { text: fullText, meta: {} }; }
    }
    return { text: fullText, meta: {} };
  };

  async function fetchProjects() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
          // Limpa a legenda para mostrar no histórico sem o código oculto
          const cleanData = data.map(p => ({
              ...p,
              caption: unpackMetadata(p.caption).text
          }));
          setProjects(cleanData);
      }
    } catch (error) {
      console.error("Erro ao buscar projetos:", error);
    }
  }

  async function loadProject(id) {
    if (!supabase) return;
    try {
      const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
      
      if (post) {
        setPostId(post.id);
        setMediaUrl(post.media_url);
        setPlatform(post.platform || 'story');
        setMediaType(post.media_type || 'video');
        setStatus(post.status || 'pending');
        
        // Recupera os dados personalizados da legenda
        const { text, meta } = unpackMetadata(post.caption);
        setCaption(text);
        if (meta.profileName) setProfileName(meta.profileName);
        if (meta.statLikes) setStatLikes(meta.statLikes);
        if (meta.statComments) setStatComments(meta.statComments);

        setGeneratedLink(`${window.location.origin}?id=${post.id}`);
        
        const { data: commentsData } = await supabase.from('comments').select('*').eq('post_id', id);
        if (commentsData) setComments(commentsData);
      }
    } catch (error) {
      console.error("Erro ao carregar projeto:", error);
    }
  }

  const handleGenerateLink = async () => {
    if (!supabase) return alert("Erro: Supabase não configurado no .env.local");

    setIsUploading(true);
    try {
      // Empacota os dados personalizados junto com a legenda para salvar tudo junto
      const fullCaption = packMetadata(caption, { profileName, statLikes, statComments });

      const { data, error } = await supabase
        .from('posts')
        .insert([{ 
            media_url: mediaUrl, 
            media_type: mediaType, 
            platform: platform, 
            caption: fullCaption, 
            status: 'pending'
        }])
        .select().single();

      if (error) throw error;

      setPostId(data.id);
      const link = `${window.location.origin}?id=${data.id}`;
      setGeneratedLink(link);
      fetchProjects();
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    if (!supabase || !postId) return;
    await supabase.from('posts').update({ status: newStatus }).eq('id', postId);
    setStatus(newStatus);
    alert(newStatus === 'approved' ? "Aprovado!" : "Solicitação enviada.");
  };

  // --- 3. UPLOAD ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      if (!supabase) throw new Error("Supabase off");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage.from('uploads').upload(fileName, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
      setMediaUrl(publicUrl);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    } catch (e) { 
      console.error(e);
      alert("Erro no upload. Verifique o bucket 'uploads' no Supabase."); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const saveComment = async () => {
    if (!newCommentText.trim()) return;
    const commentData = { x: tempPin.x, y: tempPin.y, text: newCommentText, post_id: postId };
    
    if (supabase && postId) {
      const { data } = await supabase.from('comments').insert([commentData]).select();
      if (data) setComments([...comments, data[0]]);
    } else {
      setComments([...comments, { ...commentData, id: Date.now() }]);
    }
    setTempPin(null);
    setShowFeedbackModal(false);
    setNewCommentText('');
    if (mediaType === 'video') videoRef.current?.play();
  };

  const handleMediaClick = (e) => {
    if (e.target.closest('.no-click-zone')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTempPin({ 
      x: ((e.clientX - rect.left) / rect.width) * 100, 
      y: ((e.clientY - rect.top) / rect.height) * 100 
    });
    if (mediaType === 'video') videoRef.current?.pause();
    setShowFeedbackModal(true);
  };

  const getStatusBadge = (s) => {
    if (s === 'approved') return <span className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-black uppercase border border-black tracking-widest shadow-sm">Aprovado</span>;
    if (s === 'changes') return <span className="bg-white text-red-600 text-[10px] px-3 py-1 rounded-full font-black uppercase border border-red-100 tracking-widest shadow-sm">Ajustes</span>;
    return <span className="bg-neutral-50 text-neutral-400 text-[10px] px-3 py-1 rounded-full font-black uppercase border border-neutral-100 tracking-widest">Pendente</span>;
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row text-neutral-900 font-sans selection:bg-neutral-200 overflow-hidden">
      
      {/* AVISO DE ERRO */}
      {!supabase && !isClientView && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 px-4 z-[100] flex items-center justify-center gap-2 font-bold text-xs">
          <AlertTriangle size={14} /> ATENÇÃO: Supabase não conectado. Verifique o arquivo .env.local
        </div>
      )}

      {/* === BARRA LATERAL (AGÊNCIA) === */}
      {!isClientView && (
        <div className="w-full md:w-[480px] bg-white flex flex-col h-screen z-40 shadow-2xl border-r border-neutral-100 transition-all duration-500">
          
          <div className="p-10 border-b border-neutral-50">
            {/* Título Atualizado */}
            <h1 className="text-4xl font-black text-black tracking-tighter leading-none italic">THAU<span className="text-neutral-300 not-italic">.preview</span></h1>
            <p className="text-[10px] text-neutral-400 font-black tracking-[0.4em] mt-4 uppercase">Workflow Inteligente</p>
            
            <div className="flex gap-2 mt-10 p-1.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                <button onClick={() => setActiveTab('new')} className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'new' ? 'bg-black text-white shadow-2xl scale-[1.03]' : 'text-neutral-400 hover:text-black'}`}>
                    <Plus size={16}/> Novo Post
                </button>
                <button onClick={() => { setActiveTab('dashboard'); fetchProjects(); }} className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-black text-white shadow-2xl scale-[1.03]' : 'text-neutral-400 hover:text-black'}`}>
                    <Layout size={16}/> Histórico
                </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-10 pb-32 no-scrollbar">
             {activeTab === 'new' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-[0.2em] mb-4">Formato</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['story', 'reels', 'tiktok', 'feed'].map(p => (
                                <button key={p} onClick={() => setPlatform(p)} className={`py-3 capitalize rounded-2xl text-[11px] font-black border-2 transition-all ${platform === p ? 'border-black bg-black text-white shadow-lg' : 'border-neutral-50 text-neutral-300 hover:border-neutral-200'}`}>{p}</button>
                            ))}
                        </div>
                    </div>

                    {/* === PERSONALIZAÇÃO DO PERFIL (NOVO) === */}
                    <div className="bg-neutral-50 p-6 rounded-[28px] border border-neutral-100 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User size={14} className="text-black"/>
                            <label className="text-[10px] font-black text-black uppercase tracking-[0.2em]">Personalização da Preview</label>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] font-bold text-neutral-400 ml-2 uppercase tracking-wide">Nome do Perfil (@)</label>
                                <input 
                                    className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs font-bold focus:border-black outline-none transition-all placeholder:text-neutral-300"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    placeholder="Ex: thau.app"
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[9px] font-bold text-neutral-400 ml-2 uppercase tracking-wide">Likes</label>
                                    <div className="relative">
                                        <Heart size={12} className="absolute left-3 top-3.5 text-neutral-300"/>
                                        <input 
                                            className="w-full bg-white border border-neutral-200 rounded-xl p-3 pl-8 text-xs font-bold focus:border-black outline-none placeholder:text-neutral-300"
                                            value={statLikes}
                                            onChange={(e) => setStatLikes(e.target.value)}
                                            placeholder="12k"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="text-[9px] font-bold text-neutral-400 ml-2 uppercase tracking-wide">Comentários</label>
                                    <div className="relative">
                                        <MessageCircle size={12} className="absolute left-3 top-3.5 text-neutral-300"/>
                                        <input 
                                            className="w-full bg-white border border-neutral-200 rounded-xl p-3 pl-8 text-xs font-bold focus:border-black outline-none placeholder:text-neutral-300"
                                            value={statComments}
                                            onChange={(e) => setStatComments(e.target.value)}
                                            placeholder="342"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-black uppercase tracking-[0.2em] mb-4">Mídia Principal</label>
                      <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-neutral-100 rounded-[32px] h-32 cursor-pointer hover:border-black hover:bg-neutral-50 transition-all group overflow-hidden relative">
                          {isUploading ? (
                              <RefreshCw className="animate-spin text-black mb-2" />
                          ) : (
                              <Upload className="w-8 h-8 text-neutral-200 group-hover:text-black transition-colors mb-2" />
                          )}
                          <span className="text-[10px] text-neutral-300 font-black uppercase tracking-widest group-hover:text-black">{isUploading ? 'Processando...' : 'Carregar Arquivo'}</span>
                          <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
                      </label>
                    </div>

                    {platform !== 'story' && (
                      <div className="animate-in fade-in duration-300">
                          <label className="block text-[10px] font-black text-black uppercase tracking-[0.2em] mb-4">Legenda / Copy</label>
                          <textarea className="w-full border-2 border-neutral-50 rounded-[24px] p-6 text-sm h-32 resize-none focus:border-black outline-none transition-all placeholder:text-neutral-200 font-medium" placeholder="Legenda do post..." value={caption} onChange={(e) => setCaption(e.target.value)}/>
                      </div>
                    )}

                    <button onClick={handleGenerateLink} disabled={isUploading} className="w-full bg-black text-white py-6 rounded-[24px] font-black text-[11px] tracking-[0.2em] hover:bg-neutral-800 transition-all flex items-center justify-center gap-4 shadow-2xl hover:-translate-y-1 disabled:opacity-50 active:scale-95">
                        {isUploading ? 'A PUBLICAR...' : 'PUBLICAR PARA CLIENTE'}
                    </button>

                    {generatedLink && (
                        <div className="bg-green-50 border border-green-100 p-8 rounded-[32px] mt-6 animate-in zoom-in-95 duration-500">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-black font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Link Ativo</p>
                              <button onClick={() => setGeneratedLink(null)} className="text-green-800/30 hover:text-green-800"><X size={14}/></button>
                            </div>
                            <div className="flex gap-2">
                                <input readOnly value={generatedLink} className="flex-1 text-[10px] p-4 border border-green-200 rounded-2xl bg-white text-neutral-600 outline-none font-mono" />
                                <button onClick={() => {navigator.clipboard.writeText(generatedLink); alert("Copiado!");}} className="bg-black text-white px-5 rounded-2xl hover:bg-neutral-800 shadow-lg"><Copy size={18}/></button>
                            </div>
                        </div>
                    )}
                </div>
             ) : (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-6 duration-700">
                    {projects.length === 0 ? (
                      <div className="text-center py-32 text-neutral-100">
                        <Layout size={64} className="mx-auto mb-6 opacity-20"/>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Arquivo Vazio</p>
                      </div>
                    ) : (
                      projects.map((proj) => (
                        <div key={proj.id} onClick={() => loadProject(proj.id)} className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all hover:shadow-2xl group ${postId === proj.id ? 'border-black bg-neutral-50' : 'border-transparent bg-white hover:border-neutral-100'}`}>
                            <div className="flex justify-between items-center mb-5">
                                {getStatusBadge(proj.status)}
                                <span className="text-[10px] text-neutral-200 font-black uppercase">{new Date(proj.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-6">
                                <div className="w-20 h-20 bg-neutral-100 rounded-[20px] overflow-hidden border border-neutral-100 shadow-inner flex-shrink-0">
                                    {proj.media_type === 'video' ? <video src={proj.media_url} className="w-full h-full object-cover" /> : <img src={proj.media_url} className="w-full h-full object-cover" alt="Thumb"/>}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className="text-[11px] font-black text-black uppercase tracking-widest mb-1">{proj.platform}</p>
                                    <p className="text-xs text-neutral-400 truncate font-medium">{proj.caption || 'Sem Legenda'}</p>
                                </div>
                            </div>
                        </div>
                      ))
                    )}
                </div>
             )}
          </div>
        </div>
      )}

      {/* === ÁREA DE PREVIEW (CELULAR) === */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-8 md:p-12 bg-[#080808] overflow-hidden">
        
        {/* BARRA DE AÇÃO SUPERIOR */}
        {postId && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-3xl px-8 py-5 rounded-[40px] z-50 shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/20 flex gap-10 items-center min-w-[380px] justify-between transition-all hover:scale-[1.02]">
                <div className="hidden sm:block">
                    <h2 className="font-black text-black text-[10px] uppercase tracking-[0.3em]">Aprovação Digital</h2>
                    <p className="text-neutral-400 text-[9px] font-black mt-0.5 tracking-tighter">{isClientView ? 'MODO REVISÃO CLIENTE' : 'MODO VISUALIZAÇÃO AGÊNCIA'}</p>
                </div>
                
                <div className="flex gap-3 w-full sm:w-auto">
                    {isClientView && status !== 'approved' ? (
                        <>
                            <button onClick={() => updateStatus('changes')} className="w-14 h-14 rounded-[22px] border border-neutral-100 flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm active:scale-90" title="Solicitar Alteração"><XCircle size={24}/></button>
                            <button onClick={() => updateStatus('approved')} className="bg-black text-white px-10 h-14 rounded-[22px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-xl active:scale-95 flex-1 sm:flex-none">APROVAR</button>
                        </>
                    ) : (
                        <div className="flex items-center gap-4 bg-neutral-50 px-6 py-3 rounded-2xl border border-neutral-100">
                          <span className={`w-3 h-3 rounded-full ${status === 'approved' ? 'bg-green-500 animate-pulse' : 'bg-neutral-300'}`}></span>
                          <span className="text-[10px] font-black uppercase tracking-widest">{status === 'approved' ? 'Aprovado' : 'Em Análise'}</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* FRAME DO IPHONE REALISTA */}
        <div className={`relative bg-black rounded-[70px] border-[14px] border-[#181818] shadow-[0_0_150px_rgba(0,0,0,1)] overflow-hidden flex flex-col transition-all duration-1000 ease-in-out
            ${platform === 'feed' ? 'w-[420px] h-[780px] bg-white' : 'w-[390px] h-[840px] bg-black'}
            scale-[0.8] sm:scale-0.9 lg:scale-100 ring-4 ring-white/5
        `}>
           
           {/* INTERFACE STORY DINÂMICA */}
           {platform === 'story' && (
              <div className="absolute inset-0 z-20 pointer-events-none">
                  {/* Progress Bars (Topo) */}
                  <div className="absolute top-5 left-4 right-4 flex gap-1.5">
                      <div className="h-[2px] bg-white rounded-full flex-1 overflow-hidden">
                        <div className="h-full w-2/3 bg-white/60 animate-pulse"></div>
                      </div>
                      <div className="h-[2px] bg-white/20 rounded-full flex-1"></div>
                  </div>
                  {/* Header Story (Avatar + Tempo) */}
                  <div className="absolute top-12 left-6 right-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full border-2 border-white/40 p-1 shadow-2xl">
                            <img src="https://ui-avatars.com/api/?name=THAU&background=000&color=fff" className="w-full h-full rounded-full" alt="Avatar"/>
                          </div>
                          <div className="flex flex-col">
                              <span className="text-white text-[13px] font-black tracking-wide leading-none flex items-center gap-1">{profileName} <CheckCircle size={10} className="fill-blue-400 text-white border-none"/> <span className="text-white/40 font-bold ml-1 text-[11px]">2h</span></span>
                              <span className="text-white/50 text-[10px] font-black uppercase tracking-widest mt-1">Anúncio</span>
                          </div>
                      </div>
                      <div className="pointer-events-auto cursor-pointer p-2 hover:bg-white/10 rounded-full transition-all">
                        <X className="text-white w-7 h-7" onClick={() => isClientView ? null : setPostId(null)} />
                      </div>
                  </div>
                  {/* Footer Story (Input) */}
                  <div className="absolute bottom-12 left-6 right-6 flex items-center gap-6 no-click-zone">
                      <div className="flex-1 h-14 border border-white/30 rounded-full flex items-center px-7 backdrop-blur-3xl bg-white/10 shadow-2xl">
                          <span className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em]">Enviar mensagem...</span>
                      </div>
                      <Heart className="text-white w-9 h-9 opacity-80" />
                      <Send className="text-white w-9 h-9 -rotate-45 opacity-80" />
                  </div>
              </div>
           )}

           {/* CABEÇALHO PADRÃO (REELS / TIKTOK / FEED) */}
           {platform !== 'story' && (
                <div className={`z-30 p-10 flex items-center justify-between ${platform === 'feed' ? 'text-black bg-white/95 border-b border-neutral-100 backdrop-blur-md' : 'text-white bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0'}`}>
                    <ArrowLeft className="w-8 h-8 cursor-pointer hover:scale-125 transition-transform" onClick={() => isClientView ? null : setPostId(null)} />
                    <span className="font-black text-[12px] uppercase tracking-[0.5em]">{platform}</span>
                    <div className="w-8"></div>
                </div>
           )}

           <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white">
              
              {/* Layout Feed Header */}
              {platform === 'feed' && (
                <div className="flex items-center justify-between p-6 bg-white border-b border-neutral-50">
                   <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-black p-0.5 border border-neutral-100 shadow-xl overflow-hidden">
                        <img src="https://ui-avatars.com/api/?name=THAU&background=000&color=fff" className="w-full h-full rounded-full border border-white" alt="Icon"/>
                      </div>
                      <span className="font-black text-base text-black tracking-tighter">{profileName}</span>
                   </div>
                   <MoreHorizontal className="w-7 h-7 text-neutral-200" />
                </div>
              )}

              {/* MÍDIA INTERATIVA */}
              <div className={`relative cursor-crosshair bg-black transition-all duration-500 ${platform === 'feed' ? 'aspect-[4/5] w-full shadow-2xl' : 'h-full w-full'}`} onClick={handleMediaClick}>
                  {mediaType === 'video' ? (
                    <video ref={videoRef} src={mediaUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
                  ) : (
                    <img src={mediaUrl} className="w-full h-full object-cover" alt="Media"/>
                  )}

                  {/* PINS DE FEEDBACK */}
                  {comments.map((c) => (
                    <div key={c.id} className="absolute group z-50" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                      <div className="w-12 h-12 bg-black text-white rounded-full border-4 border-white shadow-[0_25px_60px_rgba(0,0,0,1)] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-sm font-black transition-all hover:scale-[1.4] hover:bg-neutral-800 cursor-pointer animate-in zoom-in-50">
                        !
                      </div>
                      <div className="absolute left-14 top-0 bg-white text-black p-8 rounded-[36px] shadow-[0_40px_80px_rgba(0,0,0,0.5)] text-[13px] w-72 hidden group-hover:block pointer-events-none z-50 animate-in fade-in slide-in-from-left-6 border border-neutral-100 ring-1 ring-black/5">
                        <p className="font-black text-[10px] text-neutral-300 uppercase tracking-[0.3em] mb-4 border-b border-neutral-50 pb-3">Feedback Criativo</p>
                        <p className="leading-relaxed font-bold text-neutral-900 text-sm tracking-tight">{c.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* OVERLAY SOCIAL */}
                  {(platform === 'reels' || platform === 'tiktok') && (
                    <>
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent via-black/40 to-black/95 pointer-events-none"></div>
                        <div className="absolute right-6 bottom-32 flex flex-col gap-10 items-center z-20 no-click-zone">
                            <div className="flex flex-col items-center gap-2"><Heart className="w-10 h-10 text-white stroke-[2.2]" /><span className="text-[12px] text-white font-black shadow-xl">{statLikes}</span></div>
                            <div className="flex flex-col items-center gap-2"><MessageCircle className="w-10 h-10 text-white stroke-[2.2]" /><span className="text-[12px] text-white font-black shadow-xl">{statComments}</span></div>
                            <Send className="w-10 h-10 text-white stroke-[2.2] -rotate-45 shadow-2xl" />
                        </div>
                        <div className="absolute left-8 bottom-16 right-32 z-20 text-white pointer-events-none">
                            <div className="flex items-center gap-5 mb-6">
                                <span className="font-black text-xl tracking-tighter">{profileName}</span>
                                <button className="text-[10px] font-black border-2 border-white/40 px-6 py-2.5 rounded-2xl uppercase tracking-widest backdrop-blur-3xl bg-white/10 hover:bg-white/20 transition-all">Seguir</button>
                            </div>
                            <p className="text-sm leading-relaxed mb-6 line-clamp-2 font-bold text-white/90">{caption}</p>
                            <div className="flex items-center gap-4 text-[11px] font-black opacity-90 uppercase tracking-[0.2em] bg-black/40 p-3.5 rounded-2xl w-fit backdrop-blur-2xl"><Music2 size={18}/><span className="animate-pulse tracking-tighter">Som Master Original</span></div>
                        </div>
                    </>
                  )}
              </div>

              {/* Footer Feed */}
              {platform === 'feed' && (
                <div className="p-8 bg-white animate-in slide-in-from-bottom-5 duration-700">
                   <div className="flex justify-between mb-8 text-black">
                      <div className="flex gap-8"><Heart className="w-9 h-9 stroke-[2.8]" /><MessageCircle className="w-9 h-9 stroke-[2.8]" /><Send className="w-9 h-9 stroke-[2.8] -rotate-45" /></div>
                      <Bookmark className="w-9 h-9 stroke-[2.8]" />
                   </div>
                   <p className="font-black text-lg mb-2 text-black tracking-tight">{statLikes} gostos</p>
                   <p className="text-sm text-neutral-900 leading-relaxed font-medium"><span className="font-black mr-4 uppercase tracking-tighter text-base">{profileName}</span>{caption}</p>
                </div>
              )}
           </div>

           {/* MODAL FEEDBACK */}
           {showFeedbackModal && (
              <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl flex items-center justify-center z-50 animate-in fade-in duration-500 px-6" onClick={(e)=>e.stopPropagation()}>
                 <div className="bg-white p-12 rounded-[56px] shadow-[0_60px_120px_rgba(0,0,0,1)] max-w-[90%] w-full transform scale-100 transition-all border border-t-white">
                    <div className="flex items-center gap-4 mb-10">
                        <AlertCircle className="text-black animate-pulse" size={24}/>
                        <h3 className="font-black text-black text-[13px] uppercase tracking-[0.5em]">Directriz de Edição</h3>
                    </div>
                    <textarea autoFocus className="w-full border-2 border-neutral-100 rounded-[36px] p-8 mb-10 text-lg bg-neutral-50 text-black h-48 resize-none focus:border-black outline-none transition-all font-bold placeholder:text-neutral-200" placeholder="Qual ajuste é necessário?" value={newCommentText} onChange={e=>setNewCommentText(e.target.value)} />
                    <div className="flex gap-6">
                      <button onClick={saveComment} className="bg-black text-white flex-1 py-7 rounded-[28px] text-[13px] font-black uppercase tracking-[0.3em] hover:bg-neutral-800 shadow-2xl transition-all active:scale-95">Salvar Nota</button>
                      <button onClick={()=>{setShowFeedbackModal(false); if(mediaType === 'video') videoRef.current?.play()}} className="bg-neutral-100 text-neutral-400 px-12 py-7 rounded-[28px] text-[13px] font-black uppercase tracking-[0.3em] hover:bg-neutral-200 transition-all">Sair</button>
                    </div>
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
}