'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase'; 
import { Upload, Heart, MessageCircle, Send, MoreHorizontal, Music2, User } from 'lucide-react';

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-a-selfie-in-a-field-of-flowers-3444-large.mp4";

export default function App() {
  const [mode, setMode] = useState('creator'); 
  const [mediaType, setMediaType] = useState('video'); 
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  
  // Dados simulados do perfil (depois podemos deixar editável)
  const [username] = useState("@sua_marca");
  const [caption, setCaption] = useState("Olha que incrível esse resultado! 🚀 #novidade #marketing");
  
  const [comments, setComments] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tempPin, setTempPin] = useState(null); 
  const [newCommentText, setNewCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);

  // --- 1. BUSCAR COMENTÁRIOS ---
  useEffect(() => {
    async function fetchComments() {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('media_url', mediaUrl);
      if (data) setComments(data);
    }
    fetchComments();
  }, [mediaUrl]);

  // --- 2. UPLOAD ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      setMediaUrl(publicUrl);
      
      if (file.type.startsWith('video')) {
        setMediaType('video');
        setIsPlaying(true);
      } else {
        setMediaType('image');
      }
      setComments([]); 
    } catch (error) {
      console.error('Erro:', error);
      setUploadError('Erro ao subir. Tente um arquivo menor que 50MB.');
    } finally {
      setIsUploading(false);
    }
  };

  // --- 3. SALVAR COMENTÁRIO ---
  const saveComment = async () => {
    if (!newCommentText.trim()) return;
    const newComment = { x: tempPin.x, y: tempPin.y, text: newCommentText, media_url: mediaUrl };

    const { data } = await supabase.from('comments').insert([newComment]).select();
    if (data) setComments([...comments, data[0]]);

    setTempPin(null);
    setShowFeedbackModal(false);
    setNewCommentText('');
    if (mediaType === 'video') videoRef.current?.play();
  };

  const handleMediaClick = (e) => {
    // Impede clique se for nos botões de ação
    if (e.target.closest('.no-click-zone')) return;

    if (mode !== 'client') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (mediaType === 'video') videoRef.current?.pause();
    setTempPin({ x, y });
    setShowFeedbackModal(true);
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col md:flex-row text-gray-800 font-sans">
      {/* Sidebar de Controle (Esquerda) */}
      <div className={`w-full md:w-96 bg-white border-r p-6 flex flex-col h-screen overflow-y-auto z-40 ${mode === 'client' ? 'hidden md:flex' : ''}`}>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-6">Social Preview</h1>
        
        {mode === 'creator' ? (
          <div className="space-y-6">
            <div>
               <label className="block text-sm font-medium mb-2 text-gray-700">Arquivo de Mídia</label>
               <label className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'bg-gray-100 border-gray-300' : 'border-purple-300 hover:bg-purple-50 hover:border-purple-500'}`}>
                  {isUploading ? <span className="text-purple-600 font-bold animate-pulse">Enviando...</span> : (
                    <>
                      <Upload className="text-purple-500 mb-2 w-8 h-8" />
                      <span className="text-sm text-gray-600 font-medium">Clique para Upload</span>
                      <span className="text-xs text-gray-400 mt-1">Vídeo ou Foto (Máx 50MB)</span>
                    </>
                  )}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
               </label>
               {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Legenda do Post</label>
              <textarea 
                className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none" 
                rows="3"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <button onClick={() => setMode('client')} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
              👁️ Ver Como Cliente
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full justify-between">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
              <p><strong>Modo Cliente:</strong> Clique em qualquer lugar do vídeo para deixar um feedback/comentário.</p>
            </div>
            <button onClick={() => setMode('creator')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
              ← Voltar para Edição
            </button>
          </div>
        )}
      </div>

      {/* Área de Preview (Direita) */}
      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden p-4">
        {/* Celular Frame */}
        <div className="relative bg-black aspect-[9/16] h-[85vh] md:h-[90vh] rounded-[2rem] border-8 border-gray-800 overflow-hidden shadow-2xl ring-4 ring-gray-900">
           
           <div className="w-full h-full relative cursor-pointer" onClick={handleMediaClick}>
              {/* Mídia de Fundo */}
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

              {/* === OVERLAY DE REDE SOCIAL (A Mágica acontece aqui) === */}
              
              {/* 1. Sombra Gradiente (Para ler o texto branco) */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 pointer-events-none"></div>

              {/* 2. Barra Lateral Direita (Ações) */}
              <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-20 no-click-zone">
                <div className="flex flex-col items-center gap-1">
                  <Heart className="w-8 h-8 text-white stroke-[1.5] drop-shadow-md hover:scale-110 transition-transform cursor-pointer" />
                  <span className="text-white text-xs font-medium">4.5k</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <MessageCircle className="w-8 h-8 text-white stroke-[1.5] drop-shadow-md cursor-pointer" />
                  <span className="text-white text-xs font-medium">120</span>
                </div>
                <Send className="w-7 h-7 text-white stroke-[1.5] -rotate-45 mb-2 drop-shadow-md cursor-pointer" />
                <MoreHorizontal className="w-7 h-7 text-white stroke-[1.5] drop-shadow-md cursor-pointer" />
                
                {/* Disco de Música Girando */}
                <div className="w-10 h-10 bg-gray-800 rounded-full border-2 border-gray-700 flex items-center justify-center overflow-hidden animate-[spin_4s_linear_infinite] mt-2">
                   <div className="w-6 h-6 bg-gradient-to-tr from-yellow-500 to-red-500 rounded-full"></div>
                </div>
              </div>

              {/* 3. Rodapé (Usuário e Legenda) */}
              <div className="absolute bottom-6 left-4 right-16 z-20 pointer-events-none">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full p-[2px]">
                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                       <User className="text-white w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-white font-semibold text-sm drop-shadow-md">{username}</span>
                  <button className="text-white text-xs border border-white/50 px-2 py-1 rounded-lg backdrop-blur-sm pointer-events-auto">Seguir</button>
                </div>
                <p className="text-white text-sm leading-snug drop-shadow-md mb-2 font-light">
                  {caption}
                </p>
                <div className="flex items-center gap-2 text-white/90 text-xs">
                  <Music2 className="w-3 h-3" />
                  <div className="w-32 overflow-hidden">
                     <p className="whitespace-nowrap animate-marquee">Áudio Original - {username}</p>
                  </div>
                </div>
              </div>

              {/* === FIM DO OVERLAY === */}

              {/* Renderiza os comentários (Bolinhas) */}
              {comments.map((c) => (
                <div key={c.id} className="absolute group z-30" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                  <div className="w-8 h-8 bg-orange-500/90 backdrop-blur-sm rounded-full border-2 border-white shadow-xl transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform">
                    !
                  </div>
                  {/* Tooltip Estilizado */}
                  <div className="absolute left-6 top-0 bg-white/95 text-gray-800 p-3 rounded-xl shadow-2xl text-sm w-48 hidden group-hover:block pointer-events-none animate-in fade-in slide-in-from-left-2">
                    <p className="font-semibold text-xs text-purple-600 mb-1">Feedback:</p>
                    {c.text}
                  </div>
                </div>
              ))}

              {/* Modal de Digitar Feedback */}
              {showFeedbackModal && (
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={(e)=>e.stopPropagation()}>
                    <div className="bg-white p-5 rounded-2xl shadow-2xl max-w-xs w-full mx-4 transform transition-all scale-100">
                       <h3 className="mb-3 font-bold text-gray-800 text-lg">Adicionar Nota</h3>
                       <textarea 
                          autoFocus 
                          className="w-full border-2 border-gray-100 rounded-xl p-3 mb-4 text-sm focus:border-purple-500 focus:ring-0 outline-none resize-none bg-gray-50" 
                          rows="3"
                          placeholder="Ex: Melhorar a iluminação aqui..."
                          value={newCommentText} 
                          onChange={e=>setNewCommentText(e.target.value)} 
                       />
                       <div className="flex gap-3">
                         <button onClick={saveComment} className="bg-purple-600 hover:bg-purple-700 text-white flex-1 py-2.5 rounded-xl font-semibold transition-colors">Salvar</button>
                         <button onClick={()=>{setShowFeedbackModal(false); if(mediaType === 'video') videoRef.current?.play()}} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-semibold transition-colors">Cancelar</button>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}