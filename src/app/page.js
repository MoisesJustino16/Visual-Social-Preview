'use client';

import React, { useState, useRef, useEffect } from 'react';
// Importação via CDN para evitar erros de compilação em ambientes restritos
import { createClient } from 'https://esm.sh/@supabase/supabase-js'; 
import { 
  Upload, Heart, MessageCircle, Send, MoreHorizontal, Music2, 
  ArrowLeft, Link as LinkIcon, CheckCircle, Bookmark, XCircle, 
  Share2, Copy, Layout, Plus, RefreshCw, Smartphone, ChevronLeft, X, AlertTriangle
} from 'lucide-react';

// --- CONFIGURAÇÃO DO SUPABASE ---
const supabaseUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '';
const supabaseKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '';

// Inicialização segura: se as chaves não existirem, o objeto será null
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-a-selfie-in-a-field-of-flowers-3444-large.mp4";

export default function App() {
  // --- ESTADOS DE NAVEGAÇÃO ---
  const [isClientView, setIsClientView] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); 
  const [projects, setProjects] = useState([]); 

  // --- ESTADOS DO PROJETO ATUAL ---
  const [postId, setPostId] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [platform, setPlatform] = useState('story'); // Story como padrão inicial
  const [mediaType, setMediaType] = useState('video'); 
  const [status, setStatus] = useState('pending'); 
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  const [caption, setCaption] = useState("Nova campanha THAU App. Design minimalista. #THAU #Agency");
  
  // --- ESTADOS DE FEEDBACK ---
  const [comments, setComments] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tempPin, setTempPin] = useState(null); 
  const [newCommentText, setNewCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);

  // --- 1. INICIALIZAÇÃO (VERIFICA URL) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('id');

    if (idFromUrl) {
      setIsClientView(true);
      setPostId(idFromUrl);
      loadProject(idFromUrl);
    } else {
      if (supabase) fetchProjects();
    }
  }, []);

  // --- 2. FUNÇÕES DE DADOS (COM TRATAMENTO DE ERROS) ---

  async function fetchProjects() {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setProjects(data);
    } catch (err) {
      console.error("Erro ao buscar projetos:", err.message);
    }
  }

  async function loadProject(id) {
    try {
      if (!supabase) return;
      const { data: post, error } = await supabase.from('posts').select('*').eq('id', id).single();
      if (error) throw error;
      
      if (post) {
        setPostId(post.id);
        setMediaUrl(post.media_url);
        setCaption(post.caption || "");
        setPlatform(post.platform || 'story');
        setMediaType(post.media_type || 'video');
        setStatus(post.status || 'pending');
        setGeneratedLink(`${window.location.origin}?id=${post.id}`);
        
        const { data: commentsData } = await supabase.from('comments').select('*').eq('post_id', id);
        if (commentsData) setComments(commentsData);
      }
    } catch (err) {
      console.error("Erro ao carregar projeto:", err.message);
    }
  }

  const handleGenerateLink = async () => {
    if (!supabase) {
      alert("Configuração incompleta: O banco de dados Supabase não está ligado. Verifique as variáveis de ambiente.");
      return;
    }

    setIsUploading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{ 
            media_url: mediaUrl, 
            media_type: mediaType, 
            platform: platform, 
            caption: platform === 'story' ? "" : caption,
            status: 'pending'
        }])
        .select().single();

      if (error) throw error;

      setPostId(data.id);
      const link = `${window.location.origin}?id=${data.id}`;
      setGeneratedLink(link);
      fetchProjects();
    } catch (err) {
      alert("Erro ao publicar: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    if (!supabase || !postId) return;
    try {
      const { error } = await supabase.from('posts').update({ status: newStatus }).eq('id', postId);
      if (error) throw error;
      setStatus(newStatus);
    } catch (err) {
      alert("Erro ao atualizar status: " + err.message);
    }
  };

  // --- 3. UPLOAD E COMENTÁRIOS ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      if (!supabase) throw new Error("Banco de dados não configurado");
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('uploads').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
      setMediaUrl(publicUrl);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    } catch (e) { 
      alert("Erro no upload: " + e.message); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const saveComment = async () => {
    if (!newCommentText.trim()) return;
    const commentData = { x: tempPin.x, y: tempPin.y, text: newCommentText, post_id: postId };
    
    if (supabase && postId) {
      try {
        const { data, error } = await supabase.from('comments').insert([commentData]).select();
        if (error) throw error;
        if (data) setComments([...comments, data[0]]);
      } catch (e) { alert("Erro ao salvar nota: " + e.message); }
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

  // --- COMPONENTES DE UI ---
  const getStatusBadge = (s) => {
    if (s === 'approved') return <span className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-black uppercase border border-black tracking-widest shadow-sm">Aprovado</span>;
    if (s === 'changes') return <span className="bg-white text-red-600 text-[10px] px-3 py-1 rounded-full font-black uppercase border border-red-100 tracking-widest shadow-sm">Ajustes</span>;
    return <span className="bg-neutral-50 text-neutral-400 text-[10px] px-3 py-1 rounded-full font-black uppercase border border-neutral-100 tracking-widest">Pendente</span>;
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row text-neutral-900 font-sans">
      
      {/* === AVISO DE CONFIGURAÇÃO (SUPABASE OFF) === */}
      {!supabase && !isClientView && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-black py-2 px-4 z-[100] flex items-center justify-center gap-2 font-bold text-xs">
          <AlertTriangle size={14} /> SUPABASE NÃO CONFIGURADO NO .ENV.LOCAL
        </div>
      )}

      {/* === BARRA LATERAL (MODO AGÊNCIA) === */}
      {!isClientView && (
        <div className="w-full md:w-[480px] bg-white flex flex-col h-screen z-40 shadow-2xl border-r border-neutral-100 overflow-hidden">
          
          <div className="p-12 border-b border-neutral-50">
            <h1 className="text-4xl font-black text-black tracking-tighter leading-none">THAU<span className="text-neutral-300">.app</span></h1>
            <p className="text-[10px] text-neutral-400 font-black tracking-[0.4em] mt-3 uppercase">Social Approval Flow</p>
            
            <div className="flex gap-2 mt-10 p-1.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                <button onClick={() => setActiveTab('new')} className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'new' ? 'bg-black text-white shadow-2xl scale-[1.03]' : 'text-neutral-400 hover:text-black'}`}>
                    <Plus size={16}/> Novo Post
                </button>
                <button onClick={() => { setActiveTab('dashboard'); fetchProjects(); }} className={`flex-1 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-black text-white shadow-2xl scale-[1.03]' : 'text-neutral-400 hover:text-black'}`}>
                    <Layout size={16}/> Histórico
                </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-12 no-scrollbar">
             {activeTab === 'new' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-left-6 duration-700">
                    <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-[0.2em] mb-5">Formato Digital</label>
                        <div className="grid grid-cols-2 gap-4">
                            {['story', 'reels', 'tiktok', 'feed'].map(p => (
                                <button key={p} onClick={() => setPlatform(p)} className={`py-4 capitalize rounded-2xl text-[11px] font-black border-2 transition-all ${platform === p ? 'border-black bg-black text-white' : 'border-neutral-50 text-neutral-300 hover:border-neutral-200'}`}>{p}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-black uppercase tracking-[0.2em] mb-5">Media Master</label>
                        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-neutral-100 rounded-[32px] h-48 cursor-pointer hover:border-black hover:bg-neutral-50 transition-all group overflow-hidden relative">
                            {isUploading ? (
                                <RefreshCw className="animate-spin text-black mb-2" />
                            ) : (
                                <Upload className="w-10 h-10 text-neutral-100 group-hover:text-black transition-colors mb-3" />
                            )}
                            <span className="text-[10px] text-neutral-300 font-black uppercase tracking-widest group-hover:text-black">{isUploading ? 'A processar...' : 'Selecionar Arquivo'}</span>
                            <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
                        </label>
                    </div>

                    {platform !== 'story' && (
                      <div>
                          <label className="block text-[10px] font-black text-black uppercase tracking-[0.2em] mb-5">Copywriting</label>
                          <textarea className="w-full border-2 border-neutral-50 rounded-[24px] p-6 text-sm h-40 resize-none focus:border-black outline-none transition-all placeholder:text-neutral-200 font-medium" placeholder="Legenda do post..." value={caption} onChange={(e) => setCaption(e.target.value)}/>
                      </div>
                    )}

                    <button onClick={handleGenerateLink} disabled={isUploading} className="w-full bg-black text-white py-6 rounded-[24px] font-black text-[11px] tracking-[0.2em] hover:bg-neutral-800 transition-all flex items-center justify-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                        {isUploading ? 'A PUBLICAR...' : 'PUBLICAR PARA APROVAÇÃO'}
                    </button>

                    {generatedLink && (
                        <div className="bg-neutral-50 border border-neutral-100 p-8 rounded-[32px] mt-6 animate-in zoom-in-95 duration-500">
                            <p className="text-black font-black text-[10px] mb-4 uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Link Ativo</p>
                            <div className="flex gap-2">
                                <input readOnly value={generatedLink} className="flex-1 text-[10px] p-4 border border-neutral-200 rounded-2xl bg-white text-neutral-500 outline-none font-mono" />
                                <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="bg-black text-white px-5 rounded-2xl hover:bg-neutral-800 transition-colors"><Copy size={18}/></button>
                            </div>
                        </div>
                    )}
                </div>
             )}

             {activeTab === 'dashboard' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-6 duration-700">
                    {projects.length === 0 && <div className="text-center py-32 text-neutral-100"><Layout size={64} className="mx-auto mb-6 opacity-20"/><p className="text-[10px] font-black uppercase tracking-[0.3em]">Arquivo Vazio</p></div>}
                    
                    {projects.map((proj) => (
                        <div key={proj.id} onClick={() => loadProject(proj.id)} className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all hover:shadow-2xl group ${postId === proj.id ? 'border-black bg-neutral-50' : 'border-transparent bg-white hover:border-neutral-100'}`}>
                            <div className="flex justify-between items-center mb-5">
                                {getStatusBadge(proj.status)}
                                <span className="text-[10px] text-neutral-200 font-black uppercase tracking-tighter">{new Date(proj.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-6">
                                <div className="w-20 h-20 bg-neutral-100 rounded-[20px] overflow-hidden border border-neutral-100 shadow-inner flex-shrink-0">
                                    {proj.media_type === 'video' ? <video src={proj.media_url} className="w-full h-full object-cover" /> : <img src={proj.media_url} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className="text-[11px] font-black text-black uppercase tracking-widest mb-1">{proj.platform}</p>
                                    <p className="text-xs text-neutral-400 truncate font-medium">{proj.caption || 'Formato Story'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             )}
          </div>
        </div>
      )}

      {/* === ÁREA DE PREVIEW (MOLDURA IPHONE) === */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-10 bg-[#080808] overflow-hidden">
        
        {/* BARRA DE AÇÃO FLUTUANTE (TOP) */}
        {postId && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-3xl px-10 py-5 rounded-[36px] z-50 shadow-[0_40px_80px_rgba(0,0,0,0.6)] border border-white/20 flex gap-12 items-center min-w-[400px] justify-between transition-all hover:scale-[1.02]">
                <div>
                    <h2 className="font-black text-black text-[10px] uppercase tracking-[0.3em]">Status Projeto</h2>
                    {isClientView ? <p className="text-neutral-300 text-[9px] font-black mt-0.5">MODO REVISÃO CLIENTE</p> : getStatusBadge(status)}
                </div>
                
                <div className="flex gap-4">
                    {isClientView && status !== 'approved' ? (
                        <>
                            <button onClick={() => updateStatus('changes')} className="w-14 h-14 rounded-[20px] border border-neutral-100 flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all" title="Pedir Ajustes"><XCircle size={24}/></button>
                            <button onClick={() => updateStatus('approved')} className="bg-black text-white px-10 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-neutral-800 transition-all shadow-xl">APROVAR</button>
                        </>
                    ) : (
                        generatedLink && <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="text-neutral-200 hover:text-black p-4 transition-colors"><Copy size={24}/></button>
                    )}
                </div>
            </div>
        )}

        {/* FRAME DO IPHONE (ESPECÍFICO) */}
        <div className={`relative bg-black rounded-[64px] border-[14px] border-[#1a1a1a] shadow-[0_0_150px_rgba(0,0,0,1)] overflow-hidden flex flex-col transition-all duration-1000 ease-in-out
            ${platform === 'feed' ? 'w-[400px] h-[780px] bg-white' : 'w-[380px] h-[820px] bg-black'}
            scale-[0.85] lg:scale-100 ring-4 ring-white/5
        `}>
           
           {/* INTERFACE STORY REALISTA */}
           {platform === 'story' && (
              <div className="absolute inset-0 z-20 pointer-events-none">
                  {/* Progress Bars */}
                  <div className="absolute top-6 left-4 right-4 flex gap-1.5">
                      <div className="h-[2px] bg-white rounded-full flex-1 overflow-hidden">
                        <div className="h-full w-2/3 bg-white/60 animate-pulse"></div>
                      </div>
                      <div className="h-[2px] bg-white/20 rounded-full flex-1"></div>
                  </div>
                  {/* Header Story */}
                  <div className="absolute top-12 left-6 right-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full border-2 border-white/40 p-1 shadow-2xl">
                            <img src="https://ui-avatars.com/api/?name=THAU&background=000&color=fff" className="w-full h-full rounded-full" alt="Logo"/>
                          </div>
                          <div className="flex flex-col">
                              <span className="text-white text-[13px] font-black tracking-wide leading-none">thau.app <span className="text-white/40 font-bold ml-1 text-[11px]">8h</span></span>
                              <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-1">Patrocinado</span>
                          </div>
                      </div>
                      <div className="pointer-events-auto cursor-pointer p-2">
                        <X className="text-white w-7 h-7 opacity-70 hover:opacity-100" onClick={() => isClientView ? null : setPostId(null)} />
                      </div>
                  </div>
                  {/* Footer Story */}
                  <div className="absolute bottom-12 left-6 right-6 flex items-center gap-6 no-click-zone">
                      <div className="flex-1 h-14 border border-white/30 rounded-full flex items-center px-7 backdrop-blur-3xl bg-white/10 shadow-2xl">
                          <span className="text-white/40 text-sm font-bold uppercase tracking-widest">Responder...</span>
                      </div>
                      <Heart className="text-white w-9 h-9 opacity-80" />
                      <Send className="text-white w-9 h-9 -rotate-45 opacity-80" />
                  </div>
              </div>
           )}

           {/* CABEÇALHO PADRÃO (REELS / TIKTOK / FEED) */}
           {platform !== 'story' && (
                <div className={`z-30 p-10 flex items-center justify-between ${platform === 'feed' ? 'text-black bg-white border-b border-neutral-50' : 'text-white bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0'}`}>
                    <ArrowLeft className="w-7 h-7 cursor-pointer hover:scale-125 transition-transform" onClick={() => isClientView ? null : setPostId(null)} />
                    <span className="font-black text-[12px] uppercase tracking-[0.5em]">{platform}</span>
                    <div className="w-7"></div>
                </div>
           )}

           <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white">
              
              {/* Layout Feed */}
              {platform === 'feed' && (
                <div className="flex items-center justify-between p-6 bg-white border-b border-neutral-50">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-black p-1 border border-neutral-100 shadow-lg">
                        <img src="https://ui-avatars.com/api/?name=THAU&background=000&color=fff" className="w-full h-full rounded-full border border-white" alt="Avatar"/>
                      </div>
                      <span className="font-black text-base text-black tracking-tighter">thau.app</span>
                   </div>
                   <MoreHorizontal className="w-7 h-7 text-neutral-200" />
                </div>
              )}

              {/* CONTEÚDO MULTIMÉDIA (ZONA ATIVA DE PIN) */}
              <div className={`relative cursor-crosshair bg-black ${platform === 'feed' ? 'aspect-[4/5] w-full shadow-inner' : 'h-full w-full'}`} onClick={handleMediaClick}>
                  {mediaType === 'video' ? (
                    <video ref={videoRef} src={mediaUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
                  ) : (
                    <img src={mediaUrl} className="w-full h-full object-cover" alt="Media Preview"/>
                  )}

                  {/* PINS DE REVISÃO (ESTILO NEUMÓRFICO) */}
                  {comments.map((c) => (
                    <div key={c.id} className="absolute group z-50" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                      <div className="w-12 h-12 bg-black text-white rounded-full border-4 border-white shadow-[0_20px_50px_rgba(0,0,0,1)] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-sm font-black transition-all hover:scale-[1.4] hover:bg-neutral-800 cursor-pointer animate-in zoom-in">!</div>
                      <div className="absolute left-12 top-0 bg-white text-black p-7 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.5)] text-[13px] w-64 hidden group-hover:block pointer-events-none z-50 animate-in fade-in slide-in-from-left-5 border border-neutral-100">
                        <p className="font-black text-[10px] text-neutral-300 uppercase tracking-[0.2em] mb-3 border-b border-neutral-50 pb-2">Feedback Criativo</p>
                        <p className="leading-relaxed font-bold text-neutral-900">{c.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* OVERLAY SOCIAL (REELS/TIKTOK) */}
                  {(platform === 'reels' || platform === 'tiktok') && (
                    <>
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-black/40 to-black/95 pointer-events-none"></div>
                        <div className="absolute right-6 bottom-32 flex flex-col gap-10 items-center z-20 no-click-zone">
                            <div className="flex flex-col items-center gap-2"><Heart className="w-10 h-10 text-white stroke-[2]" /><span className="text-[12px] text-white font-black tracking-tight shadow-xl">82k</span></div>
                            <div className="flex flex-col items-center gap-2"><MessageCircle className="w-10 h-10 text-white stroke-[2]" /><span className="text-[12px] text-white font-black tracking-tight shadow-xl">319</span></div>
                            <Send className="w-10 h-10 text-white stroke-[2] -rotate-45" />
                            <div className="w-12 h-12 rounded-2xl border-4 border-white/20 overflow-hidden shadow-2xl animate-[spin_10s_linear_infinite]">
                                <img src="https://picsum.photos/120" className="w-full h-full object-cover" alt="Vinyl"/>
                            </div>
                        </div>
                        <div className="absolute left-8 bottom-16 right-32 z-20 text-white pointer-events-none">
                            <div className="flex items-center gap-5 mb-6">
                                <span className="font-black text-xl tracking-tighter shadow-sm">thau.app</span>
                                <button className="text-[10px] font-black border-2 border-white/40 px-5 py-2 rounded-2xl uppercase tracking-widest backdrop-blur-3xl bg-white/5 hover:bg-white/10 transition-all">Seguir</button>
                            </div>
                            <p className="text-sm leading-relaxed mb-6 line-clamp-2 font-bold text-white/90 shadow-sm">{caption}</p>
                            <div className="flex items-center gap-4 text-[11px] font-black opacity-90 uppercase tracking-[0.2em] bg-black/40 p-3 rounded-2xl w-fit backdrop-blur-xl"><Music2 size={16}/><span className="animate-pulse">Áudio Master Original</span></div>
                        </div>
                    </>
                  )}
              </div>

              {/* Rodapé Feed */}
              {platform === 'feed' && (
                <div className="p-8 bg-white animate-in slide-in-from-bottom-5">
                   <div className="flex justify-between mb-6 text-black">
                      <div className="flex gap-8"><Heart className="w-8 h-8 stroke-[2.5]" /><MessageCircle className="w-8 h-8 stroke-[2.5]" /><Send className="w-8 h-8 stroke-[2.5] -rotate-45" /></div>
                      <Bookmark className="w-8 h-8 stroke-[2.5]" />
                   </div>
                   <p className="font-black text-base mb-2 text-black tracking-tight">4,821 gostos</p>
                   <p className="text-sm text-neutral-900 leading-relaxed font-medium"><span className="font-black mr-3 uppercase tracking-tighter">thau.app</span>{caption}</p>
                </div>
              )}
           </div>

           {/* MODAL DE FEEDBACK (DESIGN STUDIO) */}
           {showFeedbackModal && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 animate-in fade-in duration-500" onClick={(e)=>e.stopPropagation()}>
                 <div className="bg-white p-12 rounded-[50px] shadow-[0_50px_100px_rgba(0,0,0,1)] max-w-[85%] w-full transform scale-100 transition-all">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-3 h-3 rounded-full bg-black animate-ping"></div>
                        <h3 className="font-black text-black text-[12px] uppercase tracking-[0.4em]">Nova Diretriz</h3>
                    </div>
                    <textarea autoFocus className="w-full border-2 border-neutral-100 rounded-[32px] p-8 mb-10 text-base bg-neutral-50 text-black h-40 resize-none focus:border-black outline-none transition-all font-bold" placeholder="O que precisa de ser alterado?" value={newCommentText} onChange={e=>setNewCommentText(e.target.value)} />
                    <div className="flex gap-5">
                      <button onClick={saveComment} className="bg-black text-white flex-1 py-6 rounded-[24px] text-[12px] font-black uppercase tracking-[0.2em] hover:bg-neutral-800 shadow-2xl transition-all active:scale-95">Salvar Nota</button>
                      <button onClick={()=>{setShowFeedbackModal(false); if(mediaType === 'video') videoRef.current?.play()}} className="bg-neutral-100 text-neutral-400 px-10 py-6 rounded-[24px] text-[12px] font-black uppercase tracking-[0.2em] hover:bg-neutral-200 transition-all">Sair</button>
                    </div>
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
}