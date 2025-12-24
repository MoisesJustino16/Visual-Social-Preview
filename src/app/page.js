'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; 
import { 
  Upload, Heart, MessageCircle, Send, MoreHorizontal, Music2, 
  ArrowLeft, Link as LinkIcon, CheckCircle, Bookmark, XCircle, 
  Share2, Copy, Layout, Plus, Clock, RefreshCw
} from 'lucide-react';

// --- CONEXÃO COM O SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-a-selfie-in-a-field-of-flowers-3444-large.mp4";

export default function App() {
  // --- ESTADOS DE NAVEGAÇÃO ---
  const [isClientView, setIsClientView] = useState(false);
  const [activeTab, setActiveTab] = useState('new'); // 'new' (Novo) ou 'dashboard' (Lista)
  const [projects, setProjects] = useState([]); // Lista de projetos salvos

  // --- ESTADOS DO PROJETO ATUAL ---
  const [postId, setPostId] = useState(null);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [platform, setPlatform] = useState('reels'); 
  const [mediaType, setMediaType] = useState('video'); 
  const [status, setStatus] = useState('pending'); 
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  const [caption, setCaption] = useState("Lançamento da nova coleção de verão! ☀️ Confira as novidades no link da bio. #moda #verao2025");
  
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
      // Se tiver ID na URL, entra no MODO CLIENTE
      setIsClientView(true);
      setPostId(idFromUrl);
      loadProject(idFromUrl);
    } else {
      // Se for a agência, carrega a lista do DASHBOARD
      fetchProjects();
    }
  }, []);

  // --- 2. FUNÇÕES DE BANCO DE DADOS ---

  // Buscar lista de projetos para o Dashboard
  async function fetchProjects() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setProjects(data);
  }

  // Carregar um projeto específico (Agência ou Cliente)
  async function loadProject(id) {
    if (!supabase) return;
    
    // Busca os dados do post
    const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
    
    if (post) {
      setPostId(post.id);
      setMediaUrl(post.media_url);
      setCaption(post.caption);
      setPlatform(post.platform);
      setMediaType(post.media_type);
      setStatus(post.status || 'pending');
      setGeneratedLink(`${window.location.origin}?id=${post.id}`);
      
      // Busca os comentários/feedback desse post
      const { data: commentsData } = await supabase.from('comments').select('*').eq('post_id', id);
      if (commentsData) setComments(commentsData);
    }
  }

  // Salvar Novo Projeto
  const handleGenerateLink = async () => {
    if (!supabase) return alert("Configure o Supabase!");

    const { data, error } = await supabase
      .from('posts')
      .insert([{ 
          media_url: mediaUrl, 
          media_type: mediaType, 
          platform: platform, 
          caption: caption,
          status: 'pending'
      }])
      .select()
      .single();

    if (error) return alert("Erro ao salvar.");

    // Atualiza estado e recarrega dashboard
    setPostId(data.id);
    const link = `${window.location.origin}?id=${data.id}`;
    setGeneratedLink(link);
    fetchProjects(); // Atualiza a lista lateral
    alert("Projeto salvo! Copie o link abaixo.");
  };

  // Atualizar Status (Cliente)
  const updateStatus = async (newStatus) => {
    if (!supabase || !postId) return;
    await supabase.from('posts').update({ status: newStatus }).eq('id', postId);
    setStatus(newStatus);
    alert(newStatus === 'approved' ? "Aprovado com sucesso!" : "Solicitação enviada para a agência.");
  };

  // --- 3. UPLOAD E COMENTÁRIOS ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      if (!supabase) throw new Error("Supabase off");
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
    
    if (supabase && postId) {
        const newComment = { x: tempPin.x, y: tempPin.y, text: newCommentText, post_id: postId };
        const { data } = await supabase.from('comments').insert([newComment]).select();
        if (data) setComments([...comments, data[0]]);
    } else {
        // Modo preview sem salvar
        setComments([...comments, { x: tempPin.x, y: tempPin.y, text: newCommentText, id: Date.now() }]);
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

  // Função auxiliar para cor do status
  const getStatusColor = (s) => {
    if (s === 'approved') return 'text-green-600 bg-green-50 border-green-200';
    if (s === 'changes') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };
  const getStatusLabel = (s) => {
    if (s === 'approved') return 'Aprovado';
    if (s === 'changes') return 'Ajustes';
    return 'Pendente';
  };

  return (
    <div className="min-h-screen bg-[#111] flex flex-col md:flex-row text-gray-800 font-sans">
      
      {/* === SIDEBAR (Apenas Agência) === */}
      {!isClientView && (
        <div className="w-full md:w-[450px] bg-white flex flex-col h-screen z-40 shadow-xl border-r border-gray-200">
          
          {/* Header Sidebar */}
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-purple-600">THAU App</h1>
            <p className="text-xs text-gray-400 font-bold tracking-widest mt-1">AGENCY DASHBOARD</p>
            
            {/* Abas de Navegação */}
            <div className="flex gap-2 mt-6 p-1 bg-gray-100 rounded-lg">
                <button onClick={() => setActiveTab('new')} className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'new' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}>
                    <Plus size={14}/> Criar Novo
                </button>
                <button onClick={() => { setActiveTab('dashboard'); fetchProjects(); }} className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}>
                    <Layout size={14}/> Histórico
                </button>
            </div>
          </div>
          
          {/* CONTEÚDO DA SIDEBAR */}
          <div className="flex-1 overflow-y-auto p-6">
             
             {/* ABA: CRIAR NOVO */}
             {activeTab === 'new' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Plataforma</label>
                        <div className="flex gap-2">
                            {['reels', 'tiktok', 'feed'].map(p => (
                                <button key={p} onClick={() => setPlatform(p)} className={`flex-1 py-2 capitalize rounded-lg text-xs font-bold border ${platform === p ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600'}`}>{p}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Arquivo</label>
                        <label className="flex items-center gap-2 w-full border border-gray-300 rounded-lg px-3 py-3 cursor-pointer hover:border-purple-500 bg-white group transition-colors">
                            <Upload className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                            <span className="text-sm text-gray-600 truncate flex-1">{isUploading ? 'Enviando...' : 'Selecionar Mídia'}</span>
                            <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Legenda</label>
                        <textarea className="w-full border border-gray-300 rounded-lg p-3 text-sm h-32 resize-none focus:border-purple-500 outline-none" value={caption} onChange={(e) => setCaption(e.target.value)}/>
                    </div>

                    <button onClick={handleGenerateLink} className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
                        <LinkIcon size={18} /> Salvar e Gerar Link
                    </button>

                    {generatedLink && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-xl mt-4 animate-in fade-in slide-in-from-top-2">
                            <p className="text-green-800 font-bold text-sm mb-2 flex items-center gap-2"><CheckCircle size={14}/> Projeto Salvo!</p>
                            <div className="flex gap-2">
                                <input readOnly value={generatedLink} className="flex-1 text-xs p-2 border rounded bg-white text-gray-500 outline-none" />
                                <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="bg-green-600 text-white p-2 rounded hover:bg-green-700"><Copy size={14}/></button>
                            </div>
                        </div>
                    )}
                </div>
             )}

             {/* ABA: DASHBOARD (LISTA DE PROJETOS) */}
             {activeTab === 'dashboard' && (
                <div className="space-y-3">
                    {projects.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Nenhum projeto ainda.</p>}
                    
                    {projects.map((proj) => (
                        <div 
                            key={proj.id} 
                            onClick={() => loadProject(proj.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${postId === proj.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-300'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(proj.status)}`}>
                                    {getStatusLabel(proj.status)}
                                </span>
                                <span className="text-[10px] text-gray-400">{new Date(proj.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                    {proj.media_type === 'video' ? <video src={proj.media_url} className="w-full h-full object-cover" /> : <img src={proj.media_url} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 capitalize mb-0.5">{proj.platform}</p>
                                    <p className="text-xs text-gray-500 truncate">{proj.caption}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button onClick={fetchProjects} className="w-full mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-purple-600">
                        <RefreshCw size={12}/> Atualizar Lista
                    </button>
                </div>
             )}
          </div>
        </div>
      )}

      {/* === ÁREA CENTRAL (PREVIEW) === */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-4 bg-[#0f0f0f] overflow-hidden">
        
        {/* BARRA SUPERIOR (Cliente ou Status Agência) */}
        {postId && (
            <div className="absolute top-0 left-0 right-0 bg-white p-4 z-50 shadow-md flex justify-between items-center px-6 md:px-10">
                <div className="flex items-center gap-3">
                    {isClientView ? (
                         <div>
                            <h2 className="font-bold text-gray-800 text-sm md:text-lg">Aprovação de Conteúdo</h2>
                            <p className="text-xs text-gray-500 hidden md:block">Clique no vídeo para marcar ajustes.</p>
                         </div>
                    ) : (
                         <div className="flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full ${status === 'approved' ? 'bg-green-500' : status === 'changes' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                             <div>
                                <h2 className="font-bold text-gray-800 text-sm">Visualizando Projeto</h2>
                                <p className="text-xs text-gray-500">Status atual: {getStatusLabel(status)}</p>
                             </div>
                         </div>
                    )}
                </div>
                
                <div className="flex gap-3">
                    {isClientView ? (
                         // Botões do Cliente
                         status === 'approved' ? (
                            <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2"><CheckCircle size={16}/> Aprovado</span>
                         ) : (
                            <>
                                <button onClick={() => updateStatus('changes')} className="border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-bold text-xs md:text-sm flex items-center gap-2">
                                    <XCircle size={16}/> Ajustes
                                </button>
                                <button onClick={() => updateStatus('approved')} className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg font-bold text-xs md:text-sm flex items-center gap-2 shadow-lg">
                                    <CheckCircle size={16}/> Aprovar
                                </button>
                            </>
                         )
                    ) : (
                        // Botões da Agência
                        generatedLink && (
                            <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2">
                                <Copy size={14}/> Copiar Link
                            </button>
                        )
                    )}
                </div>
            </div>
        )}

        {/* CELULAR / PREVIEW */}
        <div className={`relative bg-black rounded-[30px] border border-gray-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out mt-14
            ${platform === 'feed' ? 'w-[375px] h-[750px] bg-white' : 'w-[350px] h-[700px] bg-black'}
            scale-[0.85] md:scale-100 origin-top
        `}>
           
           {/* Header App Fake */}
           <div className={`z-30 p-4 flex items-center justify-between ${platform === 'feed' ? 'text-black bg-white border-b' : 'text-white bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0'}`}>
              <ArrowLeft className="w-6 h-6" />
              <span className="font-bold text-sm uppercase tracking-wide">{platform}</span>
              <div className="w-6"></div>
           </div>

           <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white">
              
              {/* Header Feed */}
              {platform === 'feed' && (
                <div className="flex items-center justify-between p-3 bg-white">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]"><img src="https://ui-avatars.com/api/?name=Sua+Marca&background=000&color=fff" className="w-full h-full rounded-full border border-white" /></div>
                      <span className="font-bold text-sm text-black">suamarca</span>
                   </div>
                   <MoreHorizontal className="w-5 h-5 text-gray-600" />
                </div>
              )}

              {/* MÍDIA INTERATIVA */}
              <div className={`relative cursor-pointer bg-black ${platform === 'feed' ? 'aspect-[4/5] w-full' : 'h-full w-full'}`} onClick={handleMediaClick}>
                  {mediaType === 'video' ? (
                    <video ref={videoRef} src={mediaUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
                  ) : (
                    <img src={mediaUrl} className="w-full h-full object-cover" />
                  )}

                  {/* PINS DE FEEDBACK */}
                  {comments.map((c) => (
                    <div key={c.id} className="absolute group z-50" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                      <div className="w-8 h-8 bg-red-500 text-white rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-bold hover:scale-110 transition-transform cursor-pointer">!</div>
                      {/* Tooltip sempre visível na agência se clicar? Não, melhor hover */}
                      <div className="absolute left-6 top-0 bg-white text-gray-800 p-3 rounded-xl shadow-xl text-xs w-48 hidden group-hover:block pointer-events-none z-50 animate-in fade-in slide-in-from-left-2 border border-gray-100">
                        <p className="font-bold text-red-500 mb-1">Feedback do Cliente:</p>{c.text}
                      </div>
                    </div>
                  ))}

                  {/* Overlay Reels/TikTok */}
                  {platform !== 'feed' && (
                    <>
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent via-black/20 to-black/90 pointer-events-none"></div>
                        <div className="absolute right-3 bottom-16 flex flex-col gap-6 items-center z-20 no-click-zone">
                            <Heart className="w-7 h-7 text-white" /><MessageCircle className="w-7 h-7 text-white" /><Send className="w-7 h-7 text-white -rotate-45" />
                        </div>
                        <div className="absolute left-4 bottom-6 right-16 z-20 text-white pointer-events-none">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-sm">@suamarca</span>
                                <button className="text-xs border border-white/40 px-2 py-0.5 rounded backdrop-blur-sm">Seguir</button>
                            </div>
                            <p className="text-sm leading-snug mb-3 line-clamp-2 font-light opacity-90">{caption}</p>
                            <div className="flex items-center gap-2 text-xs font-medium opacity-90"><Music2 className="w-3 h-3" /><span>Áudio Original</span></div>
                        </div>
                    </>
                  )}
              </div>

              {/* Footer Feed */}
              {platform === 'feed' && (
                <div className="p-3">
                   <div className="flex justify-between mb-3 text-black">
                      <div className="flex gap-4"><Heart className="w-6 h-6" /><MessageCircle className="w-6 h-6" /><Send className="w-6 h-6 -rotate-45" /></div>
                      <Bookmark className="w-6 h-6" />
                   </div>
                   <p className="font-bold text-sm mb-1 text-black">1.234 gostos</p>
                   <p className="text-sm text-gray-900 leading-snug"><span className="font-bold mr-1">suamarca</span>{caption}</p>
                </div>
              )}
           </div>

           {/* MODAL COMENTÁRIO */}
           {showFeedbackModal && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={(e)=>e.stopPropagation()}>
                 <div className="bg-white p-5 rounded-xl shadow-2xl max-w-[85%] w-full">
                    <h3 className="mb-2 font-bold text-gray-800 text-sm">Adicionar Nota</h3>
                    <textarea autoFocus className="w-full border border-gray-200 rounded-lg p-3 mb-3 text-sm bg-gray-50 text-black h-20 resize-none" placeholder="Digite aqui..." value={newCommentText} onChange={e=>setNewCommentText(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={saveComment} className="bg-red-600 text-white flex-1 py-2 rounded-lg text-sm font-semibold">Salvar</button>
                      <button onClick={()=>{setShowFeedbackModal(false); if(mediaType === 'video') videoRef.current?.play()}} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold">Cancelar</button>
                    </div>
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
}