'use client';

import React, { useState, useRef, useEffect } from 'react';
// Usando o link do CDN esm.sh para resolver o erro de compilação da biblioteca no ambiente Canvas
import { createClient } from 'https://esm.sh/@supabase/supabase-js'; 
import { 
  Upload, Heart, MessageCircle, Send, MoreHorizontal, Music2, 
  ArrowLeft, Link as LinkIcon, CheckCircle, Bookmark, XCircle, 
  Share2, Copy, Layout, Plus, RefreshCw, Smartphone, ChevronLeft, X
} from 'lucide-react';

// --- CONEXÃO COM O SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Inicializa o cliente apenas se as chaves existirem
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
  const [platform, setPlatform] = useState('reels'); // 'reels', 'tiktok', 'story', 'feed'
  const [mediaType, setMediaType] = useState('video'); 
  const [status, setStatus] = useState('pending'); 
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  const [caption, setCaption] = useState("Confira as novidades! ✨ #THAU #Agency");
  
  // --- ESTADOS DE INTERAÇÃO ---
  const [comments, setComments] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tempPin, setTempPin] = useState(null); 
  const [newCommentText, setNewCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);

  // --- 1. INICIALIZAÇÃO ---
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

  // --- 2. BANCO DE DADOS ---
  async function fetchProjects() {
    if (!supabase) return;
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
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
    if (!supabase) return alert("Configure o Supabase no .env.local!");

    const { data, error } = await supabase
      .from('posts')
      .insert([{ 
          media_url: mediaUrl, 
          media_type: mediaType, 
          platform: platform, 
          caption: platform === 'story' ? "" : caption,
          status: 'pending'
      }])
      .select()
      .single();

    if (error) return alert("Erro ao salvar.");

    setPostId(data.id);
    const link = `${window.location.origin}?id=${data.id}`;
    setGeneratedLink(link);
    fetchProjects();
    alert("Projeto criado com sucesso!");
  };

  const updateStatus = async (newStatus) => {
    if (!supabase || !postId) return;
    await supabase.from('posts').update({ status: newStatus }).eq('id', postId);
    setStatus(newStatus);
    alert(newStatus === 'approved' ? "Aprovado!" : "Solicitação enviada.");
  };

  // --- 3. UPLOAD E COMENTÁRIOS ---
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
    } catch (error) { console.error(error); } 
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

  const getStatusBadge = (s) => {
    if (s === 'approved') return <span className="bg-black text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border border-black">Aprovado</span>;
    if (s === 'changes') return <span className="bg-white text-red-600 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border border-red-200">Ajustes</span>;
    return <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border border-gray-200">Pendente</span>;
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row text-gray-800 font-sans">
      
      {/* === SIDEBAR (AGÊNCIA) === */}
      {!isClientView && (
        <div className="w-full md:w-[450px] bg-white flex flex-col h-screen z-40 shadow-2xl border-r border-gray-100">
          
          <div className="p-8 border-b border-gray-100">
            <h1 className="text-3xl font-black text-black tracking-tighter">THAU<span className="text-gray-400">.app</span></h1>
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] mt-1 uppercase">Creative Approval Workflow</p>
            
            <div className="flex gap-2 mt-8 p-1 bg-gray-50 rounded-lg border border-gray-100">
                <button onClick={() => setActiveTab('new')} className={`flex-1 py-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'new' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}>
                    <Plus size={14}/> Novo Projeto
                </button>
                <button onClick={() => { setActiveTab('dashboard'); fetchProjects(); }} className={`flex-1 py-2.5 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black'}`}>
                    <Layout size={14}/> Dashboard
                </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8">
             {activeTab === 'new' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Formato</label>
                        <div className="flex gap-2 flex-wrap">
                            {['reels', 'tiktok', 'story', 'feed'].map(p => (
                                <button key={p} onClick={() => setPlatform(p)} className={`flex-1 py-3 px-1 capitalize rounded-xl text-xs font-bold border-2 transition-all ${platform === p ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400 hover:border-gray-300'}`}>{p}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Upload de Mídia</label>
                        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-200 rounded-xl h-32 cursor-pointer hover:border-black hover:bg-gray-50 transition-all group">
                            {isUploading ? (
                                <RefreshCw className="animate-spin text-black mb-2" />
                            ) : (
                                <Upload className="w-6 h-6 text-gray-300 group-hover:text-black transition-colors mb-2" />
                            )}
                            <span className="text-xs text-gray-400 font-medium group-hover:text-black">{isUploading ? 'Processando...' : 'Arraste ou Clique'}</span>
                            <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
                        </label>
                    </div>

                    {platform !== 'story' && (
                      <div>
                          <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Legenda</label>
                          <textarea className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm h-32 resize-none focus:border-black focus:ring-0 outline-none transition-all placeholder:text-gray-300" placeholder="Escreva a legenda aqui..." value={caption} onChange={(e) => setCaption(e.target.value)}/>
                      </div>
                    )}

                    <button onClick={handleGenerateLink} className="w-full bg-black text-white py-4 rounded-xl font-bold text-sm hover:bg-gray-900 transition-all flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl hover:-translate-y-1">
                        <LinkIcon size={16} /> Salvar & Gerar Link
                    </button>

                    {generatedLink && (
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mt-4">
                            <p className="text-black font-bold text-xs mb-2 flex items-center gap-2 uppercase tracking-wide"><CheckCircle size={14}/> Projeto Criado</p>
                            <div className="flex gap-2">
                                <input readOnly value={generatedLink} className="flex-1 text-xs p-3 border border-gray-200 rounded-lg bg-white text-gray-500 outline-none font-mono" />
                                <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="bg-black text-white px-4 rounded-lg hover:bg-gray-800 transition-colors"><Copy size={14}/></button>
                            </div>
                        </div>
                    )}
                </div>
             )}

             {activeTab === 'dashboard' && ( activeTab === 'dashboard' &&
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    {projects.length === 0 && <div className="text-center py-20 text-gray-300"><Layout size={40} className="mx-auto mb-4 opacity-20"/><p className="text-sm">Nenhum projeto criado.</p></div>}
                    
                    {projects.map((proj) => (
                        <div 
                            key={proj.id} 
                            onClick={() => loadProject(proj.id)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg group ${postId === proj.id ? 'border-black bg-gray-50' : 'border-transparent bg-white hover:border-gray-100'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                {getStatusBadge(proj.status)}
                                <span className="text-[10px] text-gray-300 font-mono group-hover:text-gray-500">{new Date(proj.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 shadow-inner">
                                    {proj.media_type === 'video' ? <video src={proj.media_url} className="w-full h-full object-cover" /> : <img src={proj.media_url} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className="text-xs font-black text-black uppercase tracking-wide mb-1">{proj.platform}</p>
                                    <p className="text-xs text-gray-500 truncate">{proj.caption || 'Sem legenda'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button onClick={fetchProjects} className="w-full mt-6 py-2 flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-black uppercase tracking-wide transition-colors">
                        <RefreshCw size={12}/> Atualizar Lista
                    </button>
                </div>
             )}
          </div>
        </div>
      )}

      {/* === ÁREA CENTRAL (PREVIEW) === */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-6 bg-[#0a0a0a] overflow-hidden">
        
        {/* TOP BAR FLUTUANTE EM PRETO/BRANCO */}
        {postId && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-6 py-3 rounded-full z-50 shadow-2xl border border-white/10 flex gap-6 items-center min-w-[300px] justify-between transition-all hover:scale-105">
                <div className="flex items-center gap-3">
                    {isClientView ? (
                         <div>
                            <h2 className="font-bold text-black text-sm">Aprovação de Conteúdo</h2>
                         </div>
                    ) : (
                         <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-400 font-medium">STATUS:</span>
                             {getStatusBadge(status)}
                         </div>
                    )}
                </div>
                
                <div className="flex gap-2">
                    {isClientView ? (
                         status === 'approved' ? (
                            <span className="text-black text-xs font-bold flex items-center gap-2"><CheckCircle size={14}/> APROVADO</span>
                         ) : (
                            <>
                                <button onClick={() => updateStatus('changes')} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-all" title="Pedir Ajustes">
                                    <XCircle size={16}/>
                                </button>
                                <button onClick={() => updateStatus('approved')} className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-800 transition-all flex items-center gap-2">
                                    <CheckCircle size={14}/> APROVAR
                                </button>
                            </>
                         )
                    ) : (
                        generatedLink && (
                            <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="text-gray-400 hover:text-black transition-colors" title="Copiar Link">
                                <Copy size={16}/>
                            </button>
                        )
                    )}
                </div>
            </div>
        )}

        {/* MOLDURA DO CELULAR */}
        <div className={`relative bg-black rounded-[40px] border-[8px] border-[#1a1a1a] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ease-in-out
            ${platform === 'feed' ? 'w-[375px] h-[700px] bg-white' : 'w-[360px] h-[720px] bg-black'}
            scale-[0.9] md:scale-100 origin-center ring-1 ring-white/10
        `}>
           
           {/* Header App Fake (Escondido no Story para visual mais real) */}
           {platform !== 'story' && (
                <div className={`z-30 p-5 flex items-center justify-between ${platform === 'feed' ? 'text-black bg-white/90 backdrop-blur-sm border-b' : 'text-white bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0'}`}>
                    <ArrowLeft className="w-6 h-6 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => isClientView ? null : setPostId(null)} />
                    <span className="font-bold text-xs uppercase tracking-[0.2em]">{platform}</span>
                    <div className="w-6"></div>
                </div>
           )}

           <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white">
              
              {/* Header Feed */}
              {platform === 'feed' && (
                <div className="flex items-center justify-between p-3 bg-white">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]"><img src="https://ui-avatars.com/api/?name=THAU&background=000&color=fff" className="w-full h-full rounded-full border border-white" /></div>
                      <span className="font-bold text-sm text-black">thau.app</span>
                   </div>
                   <MoreHorizontal className="w-5 h-5 text-gray-600" />
                </div>
              )}

              {/* MÍDIA INTERATIVA */}
              <div className={`relative cursor-crosshair bg-black ${platform === 'feed' ? 'aspect-[4/5] w-full' : 'h-full w-full'}`} onClick={handleMediaClick}>
                  {mediaType === 'video' ? (
                    <video ref={videoRef} src={mediaUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
                  ) : (
                    <img src={mediaUrl} className="w-full h-full object-cover" />
                  )}

                  {/* PINS DE FEEDBACK */}
                  {comments.map((c) => (
                    <div key={c.id} className="absolute group z-50" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                      <div className="w-8 h-8 bg-black text-white rounded-full border-2 border-white shadow-xl transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-black hover:scale-110 transition-transform cursor-pointer">
                        !
                      </div>
                      <div className="absolute left-6 top-0 bg-white text-gray-900 p-3 rounded-xl shadow-2xl text-xs w-48 hidden group-hover:block pointer-events-none z-50 animate-in fade-in slide-in-from-left-2 border border-gray-100">
                        <p className="font-bold text-black mb-1 uppercase tracking-wide text-[10px]">Nota:</p>
                        <p className="leading-relaxed">{c.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* OVERLAY STORY */}
                  {platform === 'story' && (
                    <>
                        {/* Barra de Progresso no Topo */}
                        <div className="absolute top-2 left-2 right-2 flex gap-1 z-30 pointer-events-none">
                            <div className="h-0.5 bg-white/50 flex-1 rounded-full overflow-hidden">
                                <div className="h-full w-1/3 bg-white"></div>
                            </div>
                            <div className="h-0.5 bg-white/30 flex-1 rounded-full"></div>
                        </div>

                        {/* Header Story (Avatar + Nome + Tempo) */}
                        <div className="absolute top-5 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden">
                                    <img src="https://ui-avatars.com/api/?name=THAU&background=000&color=fff" className="w-full h-full" alt="Avatar" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white text-[11px] font-bold flex items-center gap-1 leading-none">thau.app <span className="text-gray-300 font-normal">14 h</span></span>
                                </div>
                            </div>
                            <div className="pointer-events-auto cursor-pointer">
                                <X className="text-white w-6 h-6" onClick={() => isClientView ? null : setPostId(null)} />
                            </div>
                        </div>

                        {/* Footer Story (Campo de mensagem) */}
                        <div className="absolute bottom-6 left-4 right-4 z-30 flex items-center gap-4 no-click-zone">
                            <div className="flex-1 h-11 border border-white/40 rounded-full flex items-center px-4 backdrop-blur-sm bg-black/10">
                                <span className="text-white/70 text-sm font-light">Enviar mensagem</span>
                            </div>
                            <Heart className="text-white w-7 h-7 stroke-[1.5]" />
                            <Send className="text-white w-7 h-7 stroke-[1.5] -rotate-45" />
                        </div>
                    </>
                  )}

                  {/* OVERLAY REELS/TIKTOK */}
                  {(platform === 'reels' || platform === 'tiktok') && (
                    <>
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-black/10 to-black/90 pointer-events-none"></div>
                        <div className="absolute right-4 bottom-20 flex flex-col gap-6 items-center z-20 no-click-zone">
                            <Heart className="w-7 h-7 text-white stroke-[1.5]" /><MessageCircle className="w-7 h-7 text-white stroke-[1.5]" /><Send className="w-7 h-7 text-white stroke-[1.5] -rotate-45" />
                        </div>
                        <div className="absolute left-4 bottom-8 right-16 z-20 text-white pointer-events-none">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="font-bold text-sm tracking-wide">thau.app</span>
                                <button className="text-[10px] font-bold border border-white/30 px-2 py-0.5 rounded uppercase tracking-wide backdrop-blur-sm">Seguir</button>
                            </div>
                            <p className="text-sm leading-snug mb-3 line-clamp-2 font-light opacity-90">{caption}</p>
                            <div className="flex items-center gap-2 text-xs font-medium opacity-80"><Music2 className="w-3 h-3" /><span className="tracking-wide uppercase text-[10px]">Som Original</span></div>
                        </div>
                    </>
                  )}
              </div>

              {/* Footer Feed */}
              {platform === 'feed' && (
                <div className="p-3 bg-white">
                   <div className="flex justify-between mb-3 text-black">
                      <div className="flex gap-4"><Heart className="w-6 h-6 stroke-black" /><MessageCircle className="w-6 h-6 stroke-black" /><Send className="w-6 h-6 stroke-black -rotate-45" /></div>
                      <Bookmark className="w-6 h-6 stroke-black" />
                   </div>
                   <p className="font-bold text-sm mb-1 text-black">4.829 curtidas</p>
                   <p className="text-sm text-gray-900 leading-snug"><span className="font-bold mr-1">thau.app</span>{caption}</p>
                </div>
              )}
           </div>

           {/* MODAL COMENTÁRIO */}
           {showFeedbackModal && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={(e)=>e.stopPropagation()}>
                 <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-[85%] w-full transform scale-100 transition-all">
                    <h3 className="mb-3 font-black text-black text-xs uppercase tracking-widest">Nova Observação</h3>
                    <textarea autoFocus className="w-full border-2 border-gray-100 rounded-xl p-3 mb-4 text-sm bg-gray-50 text-black h-24 resize-none focus:border-black focus:ring-0 outline-none transition-colors" placeholder="Descreva o ajuste necessário..." value={newCommentText} onChange={e=>setNewCommentText(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={saveComment} className="bg-black text-white flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors">Salvar Nota</button>
                      <button onClick={()=>{setShowFeedbackModal(false); if(mediaType === 'video') videoRef.current?.play()}} className="bg-black/10 text-gray-500 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-gray-200 transition-colors border border-gray-100">Cancelar</button>
                    </div>
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
}