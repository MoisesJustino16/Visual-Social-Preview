'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; 
import { 
  Upload, Heart, MessageCircle, Send, MoreHorizontal, Music2, 
  ArrowLeft, Link as LinkIcon, CheckCircle, Bookmark, XCircle, Share2, Copy
} from 'lucide-react';

// --- CONEXÃO COM O SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-a-selfie-in-a-field-of-flowers-3444-large.mp4";

export default function App() {
  // --- ESTADOS GERAIS ---
  const [postId, setPostId] = useState(null); // ID do projeto atual
  const [isClientView, setIsClientView] = useState(false); // Modo Cliente vs Editor
  const [generatedLink, setGeneratedLink] = useState(null); // Link para compartilhar

  // Estados do Visual
  const [platform, setPlatform] = useState('reels'); // 'reels', 'tiktok', 'feed'
  const [mediaType, setMediaType] = useState('video'); 
  const [status, setStatus] = useState('pending'); // 'pending', 'approved', 'changes'
  
  // Estados de Dados
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  const [caption, setCaption] = useState("Lançamento da nova coleção de verão! ☀️ Confira as novidades no link da bio. #moda #verao2025");
  
  // Estados de Funcionalidade
  const [comments, setComments] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tempPin, setTempPin] = useState(null); 
  const [newCommentText, setNewCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);

  // --- 1. INICIALIZAÇÃO (Verifica se é Link de Cliente) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('id');

    if (idFromUrl) {
      setIsClientView(true);
      setPostId(idFromUrl);
      loadProject(idFromUrl);
    }
  }, []);

  // --- 2. CARREGAR PROJETO (Modo Cliente) ---
  async function loadProject(id) {
    if (!supabase) return;
    
    // Carrega dados do post
    const { data: post } = await supabase.from('posts').select('*').eq('id', id).single();
    
    if (post) {
      setMediaUrl(post.media_url);
      setCaption(post.caption);
      setPlatform(post.platform);
      setMediaType(post.media_type);
      setStatus(post.status || 'pending');
      
      // Carrega comentários vinculados a este post
      fetchComments(id);
    }
  }

  // --- 3. BUSCAR COMENTÁRIOS ---
  async function fetchComments(pid) {
    if (!supabase || !pid) return;
    const { data } = await supabase.from('comments').select('*').eq('post_id', pid);
    if (data) setComments(data);
  }

  // --- 4. GERAR LINK (Salvar Projeto) ---
  const handleGenerateLink = async () => {
    if (!supabase) return alert("Configure o Supabase!");

    // 1. Cria o registro na tabela 'posts'
    const { data, error } = await supabase
      .from('posts')
      .insert([
        { 
          media_url: mediaUrl, 
          media_type: mediaType, 
          platform: platform, 
          caption: caption,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Erro ao salvar projeto.");
      return;
    }

    // 2. Define o ID e gera o link
    setPostId(data.id);
    const link = `${window.location.origin}?id=${data.id}`;
    setGeneratedLink(link);
  };

  // --- 5. APROVAR / SOLICITAR ALTERAÇÃO (Cliente) ---
  const updateStatus = async (newStatus) => {
    if (!supabase || !postId) return;
    
    await supabase.from('posts').update({ status: newStatus }).eq('id', postId);
    setStatus(newStatus);
    alert(newStatus === 'approved' ? "Aprovado com sucesso! 🎉" : "Solicitação de alteração enviada.");
  };

  // --- 6. UPLOAD E COMENTÁRIOS ---
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
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const saveComment = async () => {
    if (!newCommentText.trim()) return;
    
    // Se estiver no modo cliente, usa o ID do post. Se for editor (sem salvar), usa null/temp.
    const pid = postId; 

    if (supabase && pid) {
        const newComment = { 
            x: tempPin.x, 
            y: tempPin.y, 
            text: newCommentText, 
            post_id: pid // Agora vinculamos ao ID do Post
        };
        const { data } = await supabase.from('comments').insert([newComment]).select();
        if (data) setComments([...comments, data[0]]);
    } else {
        // Fallback apenas visual
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
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (mediaType === 'video') videoRef.current?.pause();
    setTempPin({ x, y });
    setShowFeedbackModal(true);
  };

  // --- RENDERIZAÇÃO ---
  return (
    <div className="min-h-screen bg-[#111] flex flex-col md:flex-row text-gray-800 font-sans">
      
      {/* === SIDEBAR (Apenas no Modo Editor) === */}
      {!isClientView && (
        <div className="w-full md:w-[420px] bg-white p-6 flex flex-col h-screen overflow-y-auto z-40 shadow-xl border-r border-gray-200">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-purple-600">Visual Social</h1>
            <p className="text-xs text-gray-400 font-bold tracking-widest mt-1">MODO AGÊNCIA</p>
          </div>
          
          <div className="space-y-6">
             {/* Seletor de Plataforma */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Plataforma</label>
                <div className="flex gap-2">
                {['reels', 'tiktok', 'feed'].map(p => (
                    <button key={p} onClick={() => setPlatform(p)} className={`flex-1 py-2 capitalize rounded-lg text-xs font-bold border ${platform === p ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600'}`}>{p}</button>
                ))}
                </div>
            </div>

            {/* Upload */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mídia</label>
                <div className="relative">
                <label className="flex items-center gap-2 w-full border border-gray-300 rounded-lg px-3 py-2.5 cursor-pointer hover:border-purple-500 bg-white">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 truncate flex-1">{isUploading ? 'Enviando...' : 'Carregar Arquivo'}</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
                </label>
                </div>
            </div>

            {/* Legenda */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Legenda</label>
                <textarea className="w-full border border-gray-300 rounded-lg p-3 text-sm h-32 resize-none" value={caption} onChange={(e) => setCaption(e.target.value)}/>
            </div>

            {/* Botão Gerar Link */}
            <div className="pt-2">
                {!generatedLink ? (
                    <button onClick={handleGenerateLink} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                        <LinkIcon size={18} /> Gerar Link de Aprovação
                    </button>
                ) : (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                        <p className="text-green-800 font-bold text-sm mb-2">Link Gerado com Sucesso! 🎉</p>
                        <div className="flex gap-2">
                            <input readOnly value={generatedLink} className="flex-1 text-xs p-2 border rounded bg-white text-gray-500" />
                            <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="bg-green-600 text-white p-2 rounded hover:bg-green-700"><Copy size={14}/></button>
                        </div>
                        <button onClick={() => {setGeneratedLink(null); setPostId(null);}} className="text-xs text-gray-400 mt-2 underline">Criar Novo Post</button>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* === ÁREA DE PREVIEW (Cliente vê isso centralizado) === */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-4 bg-[#0f0f0f] overflow-hidden">
        
        {/* Barra de Status do Cliente */}
        {isClientView && (
            <div className="absolute top-0 left-0 right-0 bg-white p-4 z-50 shadow-md flex justify-between items-center px-8">
                <div>
                    <h2 className="font-bold text-gray-800 text-lg">Aprovação de Conteúdo</h2>
                    <p className="text-xs text-gray-500">Clique na tela para adicionar correções.</p>
                </div>
                <div className="flex gap-3">
                    {status === 'approved' ? (
                        <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2"><CheckCircle size={16}/> Aprovado</span>
                    ) : (
                        <>
                            <button onClick={() => updateStatus('changes')} className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                                <XCircle size={18}/> Solicitar Alterações
                            </button>
                            <button onClick={() => updateStatus('approved')} className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-transform transform hover:scale-105">
                                <CheckCircle size={18}/> Aprovar
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* Container do Celular */}
        <div className={`relative bg-black rounded-[30px] border border-gray-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out mt-10
            ${platform === 'feed' ? 'w-[375px] h-[750px] bg-white' : 'w-[350px] h-[700px] bg-black'}
        `}>
           
           {/* Header do App (Fake) */}
           <div className={`z-30 p-4 flex items-center justify-between ${platform === 'feed' ? 'text-black bg-white border-b' : 'text-white bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0'}`}>
              <ArrowLeft className="w-6 h-6" />
              <span className="font-bold text-sm uppercase tracking-wide">{platform === 'reels' ? 'Reels' : platform === 'tiktok' ? 'TikTok' : 'Post'}</span>
              <div className="w-6"></div>
           </div>

           {/* Conteúdo */}
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

              {/* Mídia Interativa */}
              <div className={`relative cursor-pointer bg-black ${platform === 'feed' ? 'aspect-[4/5] w-full' : 'h-full w-full'}`} onClick={handleMediaClick}>
                  {mediaType === 'video' ? (
                    <video ref={videoRef} src={mediaUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
                  ) : (
                    <img src={mediaUrl} className="w-full h-full object-cover" />
                  )}

                  {/* Pins de Comentário */}
                  {comments.map((c) => (
                    <div key={c.id} className="absolute group z-50" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                      <div className="w-8 h-8 bg-red-500 text-white rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-bold hover:scale-110 transition-transform">!</div>
                      <div className="absolute left-6 top-0 bg-white text-gray-800 p-3 rounded-xl shadow-xl text-xs w-48 hidden group-hover:block pointer-events-none z-50 animate-in fade-in slide-in-from-left-2 border border-gray-100">
                        <p className="font-bold text-red-500 mb-1">Correção:</p>{c.text}
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

              {/* Rodapé Feed */}
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
           
           {/* Modal de Comentário */}
           {showFeedbackModal && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={(e)=>e.stopPropagation()}>
                 <div className="bg-white p-5 rounded-xl shadow-2xl max-w-[85%] w-full">
                    <h3 className="mb-2 font-bold text-gray-800 text-sm">Adicionar Observação</h3>
                    <textarea autoFocus className="w-full border border-gray-200 rounded-lg p-3 mb-3 text-sm bg-gray-50 text-black h-20 resize-none" placeholder="O que precisa ajustar?" value={newCommentText} onChange={e=>setNewCommentText(e.target.value)} />
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