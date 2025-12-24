'use client';

import React, { useState, useRef, useEffect } from 'react';
// Importação via CDN para garantir compatibilidade total no ambiente do navegador
import { createClient } from 'https://esm.sh/@supabase/supabase-js'; 
import { 
  Upload, Heart, MessageCircle, Send, MoreHorizontal, Music2, 
  ArrowLeft, Link as LinkIcon, CheckCircle, Bookmark, XCircle, 
  Share2, Copy, Layout, Plus, RefreshCw, Smartphone, ChevronLeft, X
} from 'lucide-react';

// --- CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-a-selfie-in-a-field-of-flowers-3444-large.mp4";

export default function App() {
  // --- ESTADOS DE NAVEGAÇÃO ---
  const [isClientView, setIsClientView] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); 
  const [projects, setProjects] = useState([]); 

  // --- ESTADOS DO PROJETO ATUAL ---
  const [postId, setPostId] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [platform, setPlatform] = useState('story'); // Story como padrão definitivo
  const [mediaType, setMediaType] = useState('video'); 
  const [status, setStatus] = useState('pending'); 
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  const [caption, setCaption] = useState("Confira o novo lançamento da THAU. Design minimalista e alta performance. #THAU #Creative");
  
  // --- ESTADOS DE INTERAÇÃO (FEEDBACK) ---
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
      fetchProjects();
    }
  }, []);

  // --- 2. FUNÇÕES DE DADOS ---

  // Lista todos os projetos no Dashboard
  async function fetchProjects() {
    if (!supabase) return;
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setProjects(data);
  }

  // Carrega um projeto específico (Agência ou Cliente)
  async function loadProject(id) {
    if (!supabase) return;
    const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
    if (post) {
      setPostId(post.id);
      setMediaUrl(post.media_url);
      setCaption(post.caption || "");
      setPlatform(post.platform);
      setMediaType(post.media_type);
      setStatus(post.status || 'pending');
      setGeneratedLink(`${window.location.origin}?id=${post.id}`);
      
      const { data: commentsData } = await supabase.from('comments').select('*').eq('post_id', id);
      if (commentsData) setComments(commentsData);
    }
  }

  // Salva o projeto e gera o link de aprovação
  const handleGenerateLink = async () => {
    if (!supabase) return alert("Configure as chaves do Supabase na Vercel ou no .env.local!");

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

    if (error) return alert("Erro ao salvar no banco.");

    setPostId(data.id);
    const link = `${window.location.origin}?id=${data.id}`;
    setGeneratedLink(link);
    fetchProjects();
  };

  // Cliente: Aprovar ou Reprovar
  const updateStatus = async (newStatus) => {
    if (!supabase || !postId) return;
    await supabase.from('posts').update({ status: newStatus }).eq('id', postId);
    setStatus(newStatus);
    alert(newStatus === 'approved' ? "Conteúdo Aprovado! 🚀" : "Feedback enviado.");
  };

  // --- 3. UPLOAD E COMENTÁRIOS ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      if (!supabase) throw new Error("Supabase não detectado");
      const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('uploads').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
      setMediaUrl(publicUrl);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    } catch (e) { console.error(e); } 
    finally { setIsUploading(false); }
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

  // Helper para Estilo dos Status
  const getStatusBadge = (s) => {
    if (s === 'approved') return <span className="bg-black text-white text-[10px] px-2 py-1 rounded font-bold uppercase border border-black shadow-sm">Aprovado</span>;
    if (s === 'changes') return <span className="bg-white text-red-600 text-[10px] px-2 py-1 rounded font-bold uppercase border border-red-200">Ajustes</span>;
    return <span className="bg-neutral-100 text-neutral-400 text-[10px] px-2 py-1 rounded font-bold uppercase border border-neutral-200">Pendente</span>;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col md:flex-row text-neutral-800 font-sans">
      
      {/* === SIDEBAR (AGÊNCIA) === */}
      {!isClientView && (
        <div className="w-full md:w-[450px] bg-white flex flex-col h-screen z-40 shadow-2xl border-r border-neutral-100">
          
          <div className="p-10 border-b border-neutral-50">
            <h1 className="text-3xl font-black text-black tracking-tighter">THAU<span className="text-neutral-300">.app</span></h1>
            <p className="text-[10px] text-neutral-400 font-bold tracking-[0.3em] mt-1 uppercase">Creative Studio</p>
            
            <div className="flex gap-2 mt-8 p-1 bg-neutral-50 rounded-xl border border-neutral-100">
                <button onClick={() => setActiveTab('new')} className={`flex-1 py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'new' ? 'bg-black text-white shadow-xl scale-[1.02]' : 'text-neutral-400 hover:text-black'}`}>
                    <Plus size={14}/> Novo Post
                </button>
                <button onClick={() => { setActiveTab('dashboard'); fetchProjects(); }} className={`flex-1 py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-black text-white shadow-xl scale-[1.02]' : 'text-neutral-400 hover:text-black'}`}>
                    <Layout size={14}/> Histórico
                </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-10">
             {activeTab === 'new' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div>
                        <label className="block text-xs font-black text-black uppercase tracking-widest mb-4">Formato de Saída</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['story', 'reels', 'tiktok', 'feed'].map(p => (
                                <button key={p} onClick={() => setPlatform(p)} className={`py-3 capitalize rounded-2xl text-xs font-bold border-2 transition-all ${platform === p ? 'border-black bg-black text-white' : 'border-neutral-100 text-neutral-400 hover:border-neutral-300'}`}>{p}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-black uppercase tracking-widest mb-4">Upload de Mídia</label>
                        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-neutral-100 rounded-3xl h-44 cursor-pointer hover:border-black hover:bg-neutral-50 transition-all group">
                            {isUploading ? (
                                <RefreshCw className="animate-spin text-black mb-2" />
                            ) : (
                                <Upload className="w-8 h-8 text-neutral-200 group-hover:text-black transition-colors mb-2" />
                            )}
                            <span className="text-xs text-neutral-400 font-bold group-hover:text-black">{isUploading ? 'Processando...' : 'Arraste ou Selecione'}</span>
                            <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
                        </label>
                    </div>

                    {platform !== 'story' && (
                      <div>
                          <label className="block text-xs font-black text-black uppercase tracking-widest mb-4">Legenda</label>
                          <textarea className="w-full border-2 border-neutral-50 rounded-3xl p-6 text-sm h-36 resize-none focus:border-black outline-none transition-all placeholder:text-neutral-300" placeholder="Escreva aqui..." value={caption} onChange={(e) => setCaption(e.target.value)}/>
                      </div>
                    )}

                    <button onClick={handleGenerateLink} className="w-full bg-black text-white py-5 rounded-2xl font-black text-xs tracking-widest hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 shadow-2xl hover:-translate-y-1">
                        <LinkIcon size={18} /> GERAR LINK DE APROVAÇÃO
                    </button>

                    {generatedLink && (
                        <div className="bg-neutral-50 border border-neutral-100 p-6 rounded-3xl mt-4 animate-in zoom-in-95">
                            <p className="text-black font-black text-[10px] mb-3 uppercase tracking-widest flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Link Gerado</p>
                            <div className="flex gap-2">
                                <input readOnly value={generatedLink} className="flex-1 text-[10px] p-3 border border-neutral-200 rounded-xl bg-white text-neutral-600 outline-none font-mono" />
                                <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="bg-black text-white px-4 rounded-xl hover:bg-neutral-800"><Copy size={16}/></button>
                            </div>
                        </div>
                    )}
                </div>
             )}

             {activeTab === 'dashboard' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    {projects.length === 0 && <div className="text-center py-24 text-neutral-200 opacity-40"><Layout size={56} className="mx-auto mb-4"/><p className="text-sm font-black uppercase tracking-widest">Nenhum Projeto</p></div>}
                    
                    {projects.map((proj) => (
                        <div key={proj.id} onClick={() => loadProject(proj.id)} className={`p-5 rounded-3xl border-2 cursor-pointer transition-all hover:shadow-xl group ${postId === proj.id ? 'border-black bg-neutral-50' : 'border-transparent bg-white hover:border-neutral-100'}`}>
                            <div className="flex justify-between items-center mb-4">
                                {getStatusBadge(proj.status)}
                                <span className="text-[10px] text-neutral-300 font-bold uppercase tracking-tighter">{new Date(proj.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-5">
                                <div className="w-16 h-16 bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-100 shadow-inner">
                                    {proj.media_type === 'video' ? <video src={proj.media_url} className="w-full h-full object-cover" /> : <img src={proj.media_url} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className="text-xs font-black text-black uppercase tracking-widest mb-1">{proj.platform}</p>
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

      {/* === ÁREA CENTRAL (PREVIEW SMARTPHONE) === */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-8 bg-[#080808] overflow-hidden">
        
        {/* BARRA DE AÇÃO SUPERIOR */}
        {postId && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-2xl px-8 py-4 rounded-[32px] z-50 shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/20 flex gap-10 items-center min-w-[350px] justify-between transition-all">
                <div>
                    <h2 className="font-black text-black text-[10px] uppercase tracking-[0.2em]">Aprovação</h2>
                    {isClientView ? <p className="text-neutral-400 text-[10px] font-bold">REVISE O CONTEÚDO ABAIXO</p> : getStatusBadge(status)}
                </div>
                
                <div className="flex gap-3">
                    {isClientView && status !== 'approved' ? (
                        <>
                            <button onClick={() => updateStatus('changes')} className="w-12 h-12 rounded-2xl border border-neutral-100 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all"><XCircle size={22}/></button>
                            <button onClick={() => updateStatus('approved')} className="bg-black text-white px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all shadow-lg">APROVAR</button>
                        </>
                    ) : (
                        generatedLink && <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="text-neutral-400 hover:text-black p-3 transition-colors"><Copy size={22}/></button>
                    )}
                </div>
            </div>
        )}

        {/* FRAME DO IPHONE */}
        <div className={`relative bg-black rounded-[60px] border-[12px] border-[#151515] shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col transition-all duration-700 ease-in-out
            ${platform === 'feed' ? 'w-[390px] h-[750px] bg-white' : 'w-[370px] h-[800px] bg-black'}
            scale-[0.85] lg:scale-100 ring-2 ring-white/5
        `}>
           
           {/* INTERFACE STORY DINÂMICA */}
           {platform === 'story' && (
              <div className="absolute inset-0 z-20 pointer-events-none">
                  {/* Progress Bars (Topo) */}
                  <div className="absolute top-5 left-4 right-4 flex gap-1.5">
                      <div className="h-[2px] bg-white rounded-full flex-1 overflow-hidden">
                        <div className="h-full w-2/3 bg-white/40 animate-pulse"></div>
                      </div>
                      <div className="h-[2px] bg-white/20 rounded-full flex-1"></div>
                  </div>
                  {/* Perfil no Story */}
                  <div className="absolute top-10 left-5 right-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border-2 border-white/30 p-0.5 shadow-lg">
                            <img src="https://ui-avatars.com/api/?name=THAU&background=000&color=fff" className="w-full h-full rounded-full" alt="User"/>
                          </div>
                          <div className="flex flex-col">
                              <span className="text-white text-[12px] font-black tracking-wide leading-none">thau.app <span className="text-white/40 font-bold ml-1 text-[10px]">10h</span></span>
                              <span className="text-white/50 text-[10px] font-black uppercase tracking-tighter">Patrocinado</span>
                          </div>
                      </div>
                      <div className="pointer-events-auto cursor-pointer p-1">
                        <X className="text-white w-6 h-6 opacity-70 hover:opacity-100" onClick={() => isClientView ? null : setPostId(null)} />
                      </div>
                  </div>
                  {/* Footer Story (Input) */}
                  <div className="absolute bottom-10 left-5 right-5 flex items-center gap-5 no-click-zone">
                      <div className="flex-1 h-14 border border-white/20 rounded-full flex items-center px-6 backdrop-blur-2xl bg-white/10">
                          <span className="text-white/50 text-sm font-medium">Enviar mensagem</span>
                      </div>
                      <Heart className="text-white w-8 h-8 opacity-90" />
                      <Send className="text-white w-8 h-8 -rotate-45 opacity-90" />
                  </div>
              </div>
           )}

           {/* CABEÇALHO REELS / TIKTOK / FEED */}
           {platform !== 'story' && (
                <div className={`z-30 p-8 flex items-center justify-between ${platform === 'feed' ? 'text-black bg-white border-b border-neutral-100' : 'text-white bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0'}`}>
                    <ArrowLeft className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform" onClick={() => isClientView ? null : setPostId(null)} />
                    <span className="font-black text-[11px] uppercase tracking-[0.4em]">{platform}</span>
                    <div className="w-6"></div>
                </div>
           )}

           <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white">
              
              {/* Topo do Feed */}
              {platform === 'feed' && (
                <div className="flex items-center justify-between p-4 bg-white">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-black p-0.5 border border-neutral-100">
                        <img src="https://ui-avatars.com/api/?name=THAU&background=000&color=fff" className="w-full h-full rounded-full border border-white" alt="THAU"/>
                      </div>
                      <span className="font-black text-sm text-black tracking-tight">thau.app</span>
                   </div>
                   <MoreHorizontal className="w-6 h-6 text-neutral-300" />
                </div>
              )}

              {/* CONTEÚDO DE MÍDIA (ZONA DE CLIQUE) */}
              <div className={`relative cursor-crosshair bg-black ${platform === 'feed' ? 'aspect-[4/5] w-full' : 'h-full w-full'}`} onClick={handleMediaClick}>
                  {mediaType === 'video' ? (
                    <video ref={videoRef} src={mediaUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
                  ) : (
                    <img src={mediaUrl} className="w-full h-full object-cover" alt="Media"/>
                  )}

                  {/* PINS DE REVISÃO (FEEDBACK) */}
                  {comments.map((c) => (
                    <div key={c.id} className="absolute group z-50" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                      <div className="w-10 h-10 bg-black text-white rounded-full border-2 border-white shadow-[0_15px_35px_rgba(0,0,0,0.9)] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-black transition-all hover:scale-125 hover:bg-neutral-800 cursor-pointer">!</div>
                      <div className="absolute left-10 top-0 bg-white text-black p-5 rounded-[24px] shadow-2xl text-[12px] w-56 hidden group-hover:block pointer-events-none z-50 animate-in fade-in slide-in-from-left-3 border border-neutral-100">
                        <p className="font-black text-[10px] text-neutral-400 uppercase tracking-widest mb-2 border-b border-neutral-50 pb-1">Solicitação de Ajuste</p>
                        <p className="leading-relaxed font-semibold text-neutral-800">{c.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* OVERLAY REELS / TIKTOK */}
                  {(platform === 'reels' || platform === 'tiktok') && (
                    <>
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-black/30 to-black/95 pointer-events-none"></div>
                        <div className="absolute right-5 bottom-28 flex flex-col gap-8 items-center z-20 no-click-zone">
                            <div className="flex flex-col items-center gap-1.5"><Heart className="w-8 h-8 text-white stroke-[1.8]" /><span className="text-[11px] text-white font-black tracking-tight">42k</span></div>
                            <div className="flex flex-col items-center gap-1.5"><MessageCircle className="w-8 h-8 text-white stroke-[1.8]" /><span className="text-[11px] text-white font-black tracking-tight">124</span></div>
                            <Send className="w-8 h-8 text-white stroke-[1.8] -rotate-45" />
                            <div className="w-10 h-10 rounded-xl border-2 border-white/20 overflow-hidden shadow-2xl animate-[spin_8s_linear_infinite]">
                                <img src="https://picsum.photos/100" className="w-full h-full object-cover" alt="Audio"/>
                            </div>
                        </div>
                        <div className="absolute left-6 bottom-12 right-24 z-20 text-white pointer-events-none">
                            <div className="flex items-center gap-4 mb-5">
                                <span className="font-black text-base tracking-tighter">thau.app</span>
                                <button className="text-[10px] font-black border-2 border-white/30 px-4 py-1.5 rounded-xl uppercase tracking-widest backdrop-blur-2xl bg-white/10 hover:bg-white/20">Seguir</button>
                            </div>
                            <p className="text-sm leading-relaxed mb-5 line-clamp-2 font-medium text-white/90">{caption}</p>
                            <div className="flex items-center gap-3 text-[11px] font-black opacity-80 uppercase tracking-widest bg-black/20 p-2 rounded-lg w-fit"><Music2 size={14}/><span className="animate-pulse">Áudio Original</span></div>
                        </div>
                    </>
                  )}
              </div>

              {/* Rodapé do Feed */}
              {platform === 'feed' && (
                <div className="p-6 bg-white animate-in slide-in-from-bottom-2">
                   <div className="flex justify-between mb-5 text-black">
                      <div className="flex gap-6"><Heart className="w-7 h-7 stroke-[2.2]" /><MessageCircle className="w-7 h-7 stroke-[2.2]" /><Send className="w-7 h-7 stroke-[2.2] -rotate-45" /></div>
                      <Bookmark className="w-7 h-7 stroke-[2.2]" />
                   </div>
                   <p className="font-black text-sm mb-2 text-black tracking-tight">2,519 curtidas</p>
                   <p className="text-sm text-neutral-800 leading-relaxed"><span className="font-black mr-2">thau.app</span>{caption}</p>
                </div>
              )}
           </div>

           {/* MODAL DE COMENTÁRIO (DESIGN PREMIUM) */}
           {showFeedbackModal && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300" onClick={(e)=>e.stopPropagation()}>
                 <div className="bg-white p-10 rounded-[40px] shadow-[0_30px_70px_rgba(0,0,0,0.7)] max-w-[85%] w-full transform scale-100">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-2.5 h-2.5 rounded-full bg-black"></div>
                        <h3 className="font-black text-black text-[11px] uppercase tracking-[0.3em]">Nota de Edição</h3>
                    </div>
                    <textarea autoFocus className="w-full border-2 border-neutral-100 rounded-3xl p-6 mb-8 text-sm bg-neutral-50 text-black h-32 resize-none focus:border-black outline-none transition-all font-medium" placeholder="O que precisamos alterar aqui?" value={newCommentText} onChange={e=>setNewCommentText(e.target.value)} />
                    <div className="flex gap-4">
                      <button onClick={saveComment} className="bg-black text-white flex-1 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] hover:bg-neutral-800 shadow-xl transition-all">Salvar Feedback</button>
                      <button onClick={()=>{setShowFeedbackModal(false); if(mediaType === 'video') videoRef.current?.play()}} className="bg-neutral-100 text-neutral-400 px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] hover:bg-neutral-200 transition-all">Sair</button>
                    </div>
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
}