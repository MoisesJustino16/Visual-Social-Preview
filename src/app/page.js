'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; 
import { 
  Upload, Heart, MessageCircle, Send, MoreHorizontal, Music2, 
  ArrowLeft, Link as LinkIcon, CheckCircle, Bookmark
} from 'lucide-react';

// --- CONEXÃO COM O SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-a-selfie-in-a-field-of-flowers-3444-large.mp4";

export default function App() {
  // Estados do Visual
  const [platform, setPlatform] = useState('reels'); // 'reels', 'tiktok', 'feed'
  const [mediaType, setMediaType] = useState('video'); 
  
  // Estados de Dados
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  const [caption, setCaption] = useState("Lançamento da nova coleção de verão! ☀️ Confira as novidades no link da bio. #moda #verao2025 #style\n\nNão perca essa oportunidade única.");
  
  // Estados de Funcionalidade
  const [comments, setComments] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tempPin, setTempPin] = useState(null); 
  const [newCommentText, setNewCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);

  // --- 1. BUSCAR COMENTÁRIOS ---
  useEffect(() => {
    async function fetchComments() {
      if (!supabase) return;
      const { data } = await supabase.from('comments').select('*').eq('media_url', mediaUrl);
      if (data) setComments(data);
    }
    fetchComments();
  }, [mediaUrl]);

  // --- 2. UPLOAD ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      if (!supabase) throw new Error("Supabase não configurado");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage.from('uploads').upload(fileName, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);
      setMediaUrl(publicUrl);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      setComments([]); 
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao subir. Verifique as chaves no .env.local');
    } finally {
      setIsUploading(false);
    }
  };

  // --- 3. SALVAR COMENTÁRIO ---
  const saveComment = async () => {
    if (!newCommentText.trim()) return;
    
    const newComment = { 
      x: tempPin.x, 
      y: tempPin.y, 
      text: newCommentText, 
      media_url: mediaUrl 
    };

    if (supabase) {
        const { data } = await supabase.from('comments').insert([newComment]).select();
        if (data) setComments([...comments, data[0]]);
    } else {
        setComments([...comments, { ...newComment, id: Date.now() }]);
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

  return (
    <div className="min-h-screen bg-[#111] flex flex-col md:flex-row text-gray-800 font-sans">
      
      {/* === SIDEBAR === */}
      <div className="w-full md:w-[420px] bg-white p-6 flex flex-col h-screen overflow-y-auto z-40 shadow-xl border-r border-gray-200">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-purple-600">Visual Social</h1>
          <p className="text-xs text-gray-400 font-bold tracking-widest mt-1">FERRAMENTA DE APROVAÇÃO</p>
        </div>
        
        <div className="space-y-6">
          
          {/* Botões de Plataforma */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Plataforma</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setPlatform('reels')}
                className={`flex-1 py-2 px-2 rounded-lg text-[13px] font-medium transition-colors border ${platform === 'reels' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                Reels
              </button>
              <button 
                onClick={() => setPlatform('tiktok')}
                className={`flex-1 py-2 px-2 rounded-lg text-[13px] font-medium transition-colors border ${platform === 'tiktok' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                TikTok
              </button>
              <button 
                onClick={() => setPlatform('feed')}
                className={`flex-1 py-2 px-2 rounded-lg text-[13px] font-medium transition-colors border ${platform === 'feed' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                Feed (4:5)
              </button>
            </div>
          </div>

          {/* Tipo de Mídia */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Mídia</label>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
               <button onClick={() => setMediaType('video')} className={`flex-1 py-1.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${mediaType === 'video' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                 <span>▶</span> Vídeo
               </button>
               <button onClick={() => setMediaType('image')} className={`flex-1 py-1.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${mediaType === 'image' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                 <span>🖼️</span> Imagem
               </button>
            </div>
          </div>

          {/* Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Upload de Mídia</label>
            <div className="relative">
              <label className="flex items-center gap-2 w-full border border-gray-300 rounded-lg px-3 py-2.5 cursor-pointer hover:border-purple-500 transition-colors bg-white">
                 <Upload className="w-4 h-4 text-gray-500" />
                 <span className="text-sm text-gray-600 truncate flex-1">{isUploading ? 'Enviando...' : 'Clique para carregar arquivo'}</span>
                 <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
              </label>
            </div>
          </div>

          {/* Legenda */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Legenda</label>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none h-32" 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-400">
               <span>Caracteres: {caption.length}</span>
               <span className="text-orange-400">↑ Corta no "mais"</span>
            </div>
          </div>

          <div className="pt-4">
             <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <LinkIcon size={18} />
                Gerar Link de Aprovação
             </button>
          </div>
        </div>
      </div>

      {/* === PREVIEW === */}
      <div className="flex-1 flex items-center justify-center relative p-4 bg-[#0f0f0f] overflow-hidden">
        
        {/* Container Dinâmico (Muda tamanho conforme plataforma) */}
        <div 
            className={`relative bg-black rounded-[30px] border border-gray-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out
            ${platform === 'feed' ? 'w-[375px] h-[750px] bg-white' : 'w-[350px] h-[700px] bg-black'}
            `}
        >
           
           {/* === CABEÇALHO DO CELULAR === */}
           <div className={`z-30 p-4 flex items-center justify-between ${platform === 'feed' ? 'text-black bg-white border-b' : 'text-white bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0'}`}>
              <ArrowLeft className="w-6 h-6" />
              <span className="font-bold text-sm uppercase tracking-wide">
                {platform === 'reels' ? 'Reels' : platform === 'tiktok' ? 'TikTok' : 'Post'}
              </span>
              <div className="w-6"></div>
           </div>

           {/* === CONTEÚDO (SCROLLÁVEL NO FEED) === */}
           <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white">
              
              {/* Se for Feed: Header do Post */}
              {platform === 'feed' && (
                <div className="flex items-center justify-between p-3 bg-white">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                         <img src="https://ui-avatars.com/api/?name=Sua+Marca&background=000&color=fff" className="w-full h-full rounded-full border border-white" />
                      </div>
                      <span className="font-bold text-sm text-black">suamarca</span>
                   </div>
                   <MoreHorizontal className="w-5 h-5 text-gray-600" />
                </div>
              )}

              {/* MÍDIA */}
              <div 
                className={`relative cursor-pointer bg-black ${platform === 'feed' ? 'aspect-[4/5] w-full' : 'h-full w-full'}`}
                onClick={handleMediaClick}
              >
                  {mediaType === 'video' ? (
                    <video 
                      ref={videoRef} 
                      src={mediaUrl} 
                      className="w-full h-full object-cover" 
                      loop muted autoPlay playsInline 
                    />
                  ) : (
                    <img src={mediaUrl} className="w-full h-full object-cover" />
                  )}

                  {/* Botão de Som (Opcional) */}
                  <div className="absolute bottom-3 right-3 bg-black/50 p-1.5 rounded-full">
                     <Music2 size={12} className="text-white" />
                  </div>

                  {/* PINS DE COMENTÁRIO */}
                  {comments.map((c) => (
                    <div key={c.id} className="absolute group z-50" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                      <div className="w-8 h-8 bg-yellow-400 text-black rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-110 transition-transform">
                        BR
                      </div>
                      <div className="absolute left-6 top-0 bg-white text-gray-800 p-3 rounded-xl shadow-xl text-xs w-48 hidden group-hover:block pointer-events-none z-50 animate-in fade-in slide-in-from-left-2 border border-gray-100">
                        <p className="font-bold text-purple-600 mb-1">Nota:</p>
                        {c.text}
                      </div>
                    </div>
                  ))}

                  {/* OVERLAY REELS/TIKTOK (Fica EM CIMA da mídia) */}
                  {platform !== 'feed' && (
                    <>
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent via-black/20 to-black/90 pointer-events-none"></div>
                        
                        {/* Ações Laterais */}
                        <div className="absolute right-3 bottom-16 flex flex-col gap-6 items-center z-20 no-click-zone">
                            <div className="flex flex-col items-center gap-1">
                                <Heart className="w-7 h-7 text-white" />
                                <span className="text-white text-xs font-medium">1.2k</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <MessageCircle className="w-7 h-7 text-white" />
                                <span className="text-white text-xs font-medium">240</span>
                            </div>
                            <Send className="w-7 h-7 text-white -rotate-45" />
                            <MoreHorizontal className="w-7 h-7 text-white" />
                        </div>

                        {/* Info Inferior */}
                        <div className="absolute left-4 bottom-6 right-16 z-20 text-white pointer-events-none">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 p-[1px]">
                                    <img src="https://ui-avatars.com/api/?name=Sua+Marca&background=000&color=fff" className="w-full h-full rounded-full" />
                                </div>
                                <span className="font-semibold text-sm">@suamarca</span>
                                <button className="text-xs border border-white/40 px-2 py-0.5 rounded pointer-events-auto backdrop-blur-sm">Seguir</button>
                            </div>
                            <p className="text-sm leading-snug mb-3 line-clamp-2 font-light opacity-90">{caption}</p>
                            <div className="flex items-center gap-2 text-xs font-medium opacity-90">
                                <Music2 className="w-3 h-3" />
                                <span>Áudio Original</span>
                            </div>
                        </div>
                    </>
                  )}
              </div>

              {/* SE FOR FEED: Barra de Ações e Legenda ABAIXO da mídia */}
              {platform === 'feed' && (
                <div className="p-3">
                   {/* Ações */}
                   <div className="flex justify-between mb-3 text-black">
                      <div className="flex gap-4">
                         <Heart className="w-6 h-6 hover:text-gray-600 cursor-pointer" />
                         <MessageCircle className="w-6 h-6 hover:text-gray-600 cursor-pointer" />
                         <Send className="w-6 h-6 hover:text-gray-600 cursor-pointer -rotate-45" />
                      </div>
                      <Bookmark className="w-6 h-6 hover:text-gray-600 cursor-pointer" />
                   </div>
                   
                   {/* Likes e Legenda */}
                   <p className="font-bold text-sm mb-1 text-black">1.234 gostos</p>
                   <p className="text-sm text-gray-900 leading-snug">
                      <span className="font-bold mr-1">suamarca</span>
                      {caption}
                   </p>
                   <p className="text-gray-400 text-[10px] uppercase mt-2">HÁ 2 HORAS</p>
                </div>
              )}

           </div>
           
           {/* MODAL DE COMENTÁRIO */}
           {showFeedbackModal && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={(e)=>e.stopPropagation()}>
                 <div className="bg-white p-5 rounded-xl shadow-2xl max-w-[85%] w-full">
                    <h3 className="mb-2 font-bold text-gray-800 text-sm">Deixar Feedback</h3>
                    <textarea 
                       autoFocus 
                       className="w-full border border-gray-200 rounded-lg p-3 mb-3 text-sm outline-none bg-gray-50 text-black h-20 resize-none" 
                       placeholder="Escreva sua observação aqui..."
                       value={newCommentText} 
                       onChange={e=>setNewCommentText(e.target.value)} 
                    />
                    <div className="flex gap-2">
                      <button onClick={saveComment} className="bg-purple-600 hover:bg-purple-700 text-white flex-1 py-2 rounded-lg text-sm font-semibold transition-colors">Salvar Nota</button>
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