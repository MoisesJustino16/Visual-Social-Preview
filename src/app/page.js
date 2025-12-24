'use client';

import React, { useState, useRef, useEffect } from 'react';
// Importação via CDN para garantir funcionamento no ambiente do navegador
import { createClient } from 'https://esm.sh/@supabase/supabase-js'; 
import { 
  Upload, Heart, MessageCircle, Send, MoreHorizontal, Music2, 
  ArrowLeft, Link as LinkIcon, CheckCircle, Bookmark, XCircle, 
  Share2, Copy, Layout, Plus, RefreshCw, Smartphone, ChevronLeft, X
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-a-selfie-in-a-field-of-flowers-3444-large.mp4";

export default function App() {
  // --- ESTADOS DE NAVEGAÇÃO E UI ---
  const [isClientView, setIsClientView] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); 
  const [projects, setProjects] = useState([]); 

  // --- ESTADOS DO PROJETO ---
  const [postId, setPostId] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [platform, setPlatform] = useState('story'); // Padrão agora como Story para teste
  const [mediaType, setMediaType] = useState('video'); 
  const [status, setStatus] = useState('pending'); 
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  const [caption, setCaption] = useState("Nova campanha THAU App. Minimalista e eficiente. #Creative #Workflow");
  
  // --- INTERAÇÕES ---
  const [comments, setComments] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tempPin, setTempPin] = useState(null); 
  const [newCommentText, setNewCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);

  // --- INICIALIZAÇÃO ---
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

  // --- FUNÇÕES DE DADOS ---
  async function fetchProjects() {
    if (!supabase) return;
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) setProjects(data);
  }

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

  const handleGenerateLink = async () => {
    if (!supabase) return alert("Erro: Chaves do Supabase não encontradas no .env.local");

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

    if (error) return alert("Erro ao salvar projeto no banco.");

    setPostId(data.id);
    const link = `${window.location.origin}?id=${data.id}`;
    setGeneratedLink(link);
    fetchProjects();
  };

  const updateStatus = async (newStatus) => {
    if (!supabase || !postId) return;
    await supabase.from('posts').update({ status: newStatus }).eq('id', postId);
    setStatus(newStatus);
    alert(newStatus === 'approved' ? "Conteúdo Aprovado! ✨" : "Feedback enviado para a agência.");
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      if (!supabase) throw new Error("Supabase não configurado");
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

  // --- RENDERIZADOR DE BADGES ---
  const getStatusBadge = (s) => {
    if (s === 'approved') return <span className="bg-black text-white text-[10px] px-2 py-1 rounded font-bold uppercase border border-black">Aprovado</span>;
    if (s === 'changes') return <span className="bg-white text-red-600 text-[10px] px-2 py-1 rounded font-bold uppercase border border-red-200">Ajustes</span>;
    return <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded font-bold uppercase border border-gray-200">Pendente</span>;
  };

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col md:flex-row text-gray-800 font-sans">
      
      {/* === SIDEBAR AGÊNCIA === */}
      {!isClientView && (
        <div className="w-full md:w-[450px] bg-white flex flex-col h-screen z-40 shadow-2xl border-r border-gray-100 transition-all duration-300">
          <div className="p-8 border-b border-gray-50">
            <h1 className="text-3xl font-black text-black tracking-tighter">THAU<span className="text-gray-300">.app</span></h1>
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-1 uppercase">Sistema de Aprovação</p>
            
            <div className="flex gap-2 mt-8 p-1 bg-gray-50 rounded-xl border border-gray-100">
                <button onClick={() => setActiveTab('new')} className={`flex-1 py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'new' ? 'bg-black text-white shadow-xl scale-[1.02]' : 'text-gray-400 hover:text-black'}`}>
                    <Plus size={14}/> Novo Post
                </button>
                <button onClick={() => { setActiveTab('dashboard'); fetchProjects(); }} className={`flex-1 py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-black text-white shadow-xl scale-[1.02]' : 'text-gray-400 hover:text-black'}`}>
                    <Layout size={14}/> Histórico
                </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8">
             {activeTab === 'new' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Escolha o Formato</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['story', 'reels', 'tiktok', 'feed'].map(p => (
                                <button key={p} onClick={() => setPlatform(p)} className={`py-3 capitalize rounded-xl text-xs font-bold border-2 transition-all ${platform === p ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>{p}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Arquivo de Mídia</label>
                        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-100 rounded-2xl h-40 cursor-pointer hover:border-black hover:bg-gray-50 transition-all group">
                            {isUploading ? (
                                <RefreshCw className="animate-spin text-black mb-2" />
                            ) : (
                                <Upload className="w-8 h-8 text-gray-200 group-hover:text-black transition-colors mb-2" />
                            )}
                            <span className="text-xs text-gray-400 font-bold group-hover:text-black">{isUploading ? 'Enviando...' : 'Carregar Vídeo/Foto'}</span>
                            <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
                        </label>
                    </div>

                    {platform !== 'story' && (
                      <div>
                          <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Legenda do Post</label>
                          <textarea className="w-full border-2 border-gray-50 rounded-2xl p-5 text-sm h-32 resize-none focus:border-black outline-none transition-all" placeholder="Digite a legenda..." value={caption} onChange={(e) => setCaption(e.target.value)}/>
                      </div>
                    )}

                    <button onClick={handleGenerateLink} className="w-full bg-black text-white py-5 rounded-2xl font-black text-sm hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 shadow-2xl hover:-translate-y-1">
                        <LinkIcon size={18} /> GERAR LINK DE APROVAÇÃO
                    </button>

                    {generatedLink && (
                        <div className="bg-green-50 border border-green-100 p-5 rounded-2xl mt-4 animate-in zoom-in-95">
                            <p className="text-green-800 font-black text-[10px] mb-3 uppercase tracking-widest flex items-center gap-2"><CheckCircle size={14}/> Sucesso</p>
                            <div className="flex gap-2">
                                <input readOnly value={generatedLink} className="flex-1 text-[10px] p-3 border border-green-200 rounded-xl bg-white text-gray-600 outline-none font-mono" />
                                <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="bg-green-600 text-white px-4 rounded-xl hover:bg-green-700 transition-colors"><Copy size={16}/></button>
                            </div>
                        </div>
                    )}
                </div>
             )}

             {activeTab === 'dashboard' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    {projects.length === 0 && <div className="text-center py-20 text-gray-200 opacity-50"><Layout size={48} className="mx-auto mb-4"/><p className="text-sm font-bold uppercase tracking-widest">Vazio</p></div>}
                    
                    {projects.map((proj) => (
                        <div key={proj.id} onClick={() => loadProject(proj.id)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-xl group ${postId === proj.id ? 'border-black bg-gray-50' : 'border-transparent bg-white hover:border-gray-100'}`}>
                            <div className="flex justify-between items-center mb-3">
                                {getStatusBadge(proj.status)}
                                <span className="text-[10px] text-gray-300 font-mono">{new Date(proj.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
                                    {proj.media_type === 'video' ? <video src={proj.media_url} className="w-full h-full object-cover" /> : <img src={proj.media_url} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className="text-xs font-black text-black uppercase tracking-widest mb-1">{proj.platform}</p>
                                    <p className="text-xs text-gray-400 truncate">{proj.caption || 'Sem legenda'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             )}
          </div>
        </div>
      )}

      {/* === ÁREA DE PREVIEW (CELULAR) === */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-6 bg-[#0c0c0c] overflow-hidden">
        
        {/* BARRA DE AÇÃO FLUTUANTE */}
        {postId && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl px-6 py-4 rounded-3xl z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 flex gap-8 items-center min-w-[320px] justify-between transition-all">
                <div>
                    <h2 className="font-black text-black text-[10px] uppercase tracking-widest">Workflow</h2>
                    {isClientView ? <p className="text-gray-400 text-[10px] font-bold">AGUARDANDO SUA REVISÃO</p> : getStatusBadge(status)}
                </div>
                
                <div className="flex gap-2">
                    {isClientView && status !== 'approved' ? (
                        <>
                            <button onClick={() => updateStatus('changes')} className="w-10 h-10 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"><XCircle size={20}/></button>
                            <button onClick={() => updateStatus('approved')} className="bg-black text-white px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center gap-2">APROVAR</button>
                        </>
                    ) : (
                        generatedLink && <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="text-gray-400 hover:text-black p-2"><Copy size={20}/></button>
                    )}
                </div>
            </div>
        )}

        {/* FRAME DO SMARTPHONE */}
        <div className={`relative bg-black rounded-[50px] border-[10px] border-[#181818] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-700 ease-in-out
            ${platform === 'feed' ? 'w-[380px] h-[700px] bg-white' : 'w-[360px] h-[750px] bg-black'}
            scale-[0.85] md:scale-100
        `}>
           
           {/* INTERFACE STORY */}
           {platform === 'story' && (
              <div className="absolute inset-0 z-20 pointer-events-none">
                  {/* Progress Bars */}
                  <div className="absolute top-4 left-3 right-3 flex gap-1.5">
                      <div className="h-[2px] bg-white rounded-full flex-1 overflow-hidden"><div className="h-full w-1/2 bg-white/40 animate-pulse"></div></div>
                      <div className="h-[2px] bg-white/30 rounded-full flex-1"></div>
                  </div>
                  {/* Header Story */}
                  <div className="absolute top-8 left-4 right-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full border-2 border-white/20 p-0.5"><img src="https://ui-avatars.com/api/?name=THAU&background=000&color=fff" className="w-full h-full rounded-full" /></div>
                          <div className="flex flex-col">
                              <span className="text-white text-[11px] font-black tracking-wide leading-none">thau.app <span className="text-white/50 font-medium ml-1">12h</span></span>
                              <span className="text-white/60 text-[9px] font-bold">Publicidade</span>
                          </div>
                      </div>
                      <div className="pointer-events-auto cursor-pointer p-1"><X className="text-white w-6 h-6" onClick={() => isClientView ? null : setPostId(null)} /></div>
                  </div>
                  {/* Footer Story Message */}
                  <div className="absolute bottom-8 left-4 right-4 flex items-center gap-4 no-click-zone">
                      <div className="flex-1 h-12 border border-white/30 rounded-full flex items-center px-5 backdrop-blur-md bg-white/5">
                          <span className="text-white/60 text-xs font-medium">Enviar mensagem</span>
                      </div>
                      <Heart className="text-white w-7 h-7" />
                      <Send className="text-white w-7 h-7 -rotate-45" />
                  </div>
              </div>
           )}

           {/* CABEÇALHO REELS/TIKTOK/FEED */}
           {platform !== 'story' && (
                <div className={`z-30 p-6 flex items-center justify-between ${platform === 'feed' ? 'text-black bg-white border-b' : 'text-white bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0'}`}>
                    <ArrowLeft className="w-6 h-6 cursor-pointer" onClick={() => isClientView ? null : setPostId(null)} />
                    <span className="font-black text-[10px] uppercase tracking-[0.3em]">{platform}</span>
                    <div className="w-6"></div>
                </div>
           )}

           <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white">
              
              {/* Layout Feed */}
              {platform === 'feed' && (
                <div className="flex items-center justify-between p-4 bg-white">
                   <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-black p-0.5"><img src="https://ui-avatars.com/api/?name=THAU&background=000&color=fff" className="w-full h-full rounded-full border border-white" /></div>
                      <span className="font-black text-xs text-black tracking-tight">thau.app</span>
                   </div>
                   <MoreHorizontal className="w-5 h-5 text-gray-400" />
                </div>
              )}

              {/* CONTEÚDO PRINCIPAL (CLICK PARA PIN) */}
              <div className={`relative cursor-crosshair bg-black ${platform === 'feed' ? 'aspect-[4/5] w-full' : 'h-full w-full'}`} onClick={handleMediaClick}>
                  {mediaType === 'video' ? (
                    <video ref={videoRef} src={mediaUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
                  ) : (
                    <img src={mediaUrl} className="w-full h-full object-cover" />
                  )}

                  {/* PINOS DE FEEDBACK */}
                  {comments.map((c) => (
                    <div key={c.id} className="absolute group z-50" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                      <div className="w-9 h-9 bg-black text-white rounded-full border-2 border-white shadow-[0_10px_30px_rgba(0,0,0,0.8)] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-black transition-transform hover:scale-125 cursor-pointer">!</div>
                      <div className="absolute left-8 top-0 bg-white text-black p-4 rounded-2xl shadow-2xl text-[11px] w-52 hidden group-hover:block pointer-events-none z-50 animate-in fade-in slide-in-from-left-2 border border-gray-100">
                        <p className="font-black text-[9px] text-gray-400 uppercase tracking-widest mb-1">Ajuste Solicitado</p>
                        <p className="leading-relaxed font-medium">{c.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* OVERLAY REELS/TIKTOK */}
                  {(platform === 'reels' || platform === 'tiktok') && (
                    <>
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent via-black/20 to-black/90 pointer-events-none"></div>
                        <div className="absolute right-4 bottom-24 flex flex-col gap-7 items-center z-20 no-click-zone">
                            <div className="flex flex-col items-center gap-1"><Heart className="w-8 h-8 text-white stroke-[1.5]" /><span className="text-[10px] text-white font-bold">12k</span></div>
                            <div className="flex flex-col items-center gap-1"><MessageCircle className="w-8 h-8 text-white stroke-[1.5]" /><span className="text-[10px] text-white font-bold">84</span></div>
                            <Send className="w-8 h-8 text-white stroke-[1.5] -rotate-45" />
                        </div>
                        <div className="absolute left-5 bottom-10 right-20 z-20 text-white pointer-events-none">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="font-black text-sm tracking-tight">thau.app</span>
                                <button className="text-[9px] font-black border border-white/40 px-3 py-1 rounded-lg uppercase tracking-widest backdrop-blur-xl">Seguir</button>
                            </div>
                            <p className="text-xs leading-relaxed mb-4 line-clamp-2 font-medium opacity-90">{caption}</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold opacity-70"><Music2 size={12}/><span className="uppercase tracking-widest">Áudio Original</span></div>
                        </div>
                    </>
                  )}
              </div>

              {/* Rodapé Feed */}
              {platform === 'feed' && (
                <div className="p-5 bg-white">
                   <div className="flex justify-between mb-4 text-black">
                      <div className="flex gap-5"><Heart className="w-6 h-6 stroke-[2]" /><MessageCircle className="w-6 h-6 stroke-[2]" /><Send className="w-6 h-6 stroke-[2] -rotate-45" /></div>
                      <Bookmark className="w-6 h-6 stroke-[2]" />
                   </div>
                   <p className="font-black text-xs mb-2 text-black tracking-tight">1,248 curtidas</p>
                   <p className="text-xs text-gray-800 leading-relaxed"><span className="font-black mr-2">thau.app</span>{caption}</p>
                </div>
              )}
           </div>

           {/* MODAL COMENTÁRIO */}
           {showFeedbackModal && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in" onClick={(e)=>e.stopPropagation()}>
                 <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-[85%] w-full transform scale-100">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-black"></div>
                        <h3 className="font-black text-black text-[10px] uppercase tracking-[0.2em]">Nota de Revisão</h3>
                    </div>
                    <textarea autoFocus className="w-full border-2 border-gray-100 rounded-2xl p-4 mb-6 text-sm bg-gray-50 text-black h-28 resize-none focus:border-black outline-none transition-all" placeholder="Qual ajuste precisamos fazer aqui?" value={newCommentText} onChange={e=>setNewCommentText(e.target.value)} />
                    <div className="flex gap-3">
                      <button onClick={saveComment} className="bg-black text-white flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all">Salvar Nota</button>
                      <button onClick={()=>{setShowFeedbackModal(false); if(mediaType === 'video') videoRef.current?.play()}} className="bg-gray-100 text-gray-400 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-200">Sair</button>
                    </div>
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
}