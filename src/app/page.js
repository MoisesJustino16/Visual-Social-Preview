'use client';

import React, { useState, useRef, useEffect } from 'react';
// Correção: Voltamos para './supabase' pois o arquivo deve estar na mesma pasta app
import { supabase } from './supabase'; 
import { 
  Upload, Heart, MessageCircle, Send, MoreHorizontal, Music2, User, 
  Home, Search, PlusSquare, Battery, Wifi, Signal, ChevronLeft, Smartphone 
} from 'lucide-react';

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-a-selfie-in-a-field-of-flowers-3444-large.mp4";

export default function App() {
  const [mode, setMode] = useState('creator'); 
  const [mediaType, setMediaType] = useState('video'); 
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  
  // Dados simulados
  const [username] = useState("@sua_marca");
  const [caption, setCaption] = useState("Olha que incrível esse resultado! 🚀 #novidade #marketing");
  
  const [comments, setComments] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tempPin, setTempPin] = useState(null); 
  const [newCommentText, setNewCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const videoRef = useRef(null);

  // --- 1. BUSCAR COMENTÁRIOS ---
  useEffect(() => {
    async function fetchComments() {
      // Verifica se o supabase está configurado antes de chamar
      if (!supabase) return;
      
      try {
        const { data, error } = await supabase.from('comments').select('*').eq('media_url', mediaUrl);
        if (error) console.error("Erro ao buscar comentários:", error);
        if (data) setComments(data);
      } catch (e) {
        console.error("Erro de conexão:", e);
      }
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
      if (!supabase) throw new Error("Supabase não configurado ou arquivo supabase.js não encontrado");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('uploads').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(fileName);

      setMediaUrl(publicUrl);
      if (file.type.startsWith('video')) {
        setMediaType('video');
      } else {
        setMediaType('image');
      }
      setComments([]); 
    } catch (error) {
      console.error('Erro:', error);
      setUploadError('Erro ao subir. Verifique se configurou o Supabase.');
    } finally {
      setIsUploading(false);
    }
  };

  // --- 3. SALVAR COMENTÁRIO ---
  const saveComment = async () => {
    if (!newCommentText.trim()) return;
    
    try {
        // Se não tiver supabase, salva apenas localmente para teste
        if (!supabase) {
            console.warn("Supabase não detectado, salvando localmente");
            setComments([...comments, { id: Date.now(), x: tempPin.x, y: tempPin.y, text: newCommentText }]);
        } else {
            const newComment = { x: tempPin.x, y: tempPin.y, text: newCommentText, media_url: mediaUrl };
            const { data, error } = await supabase.from('comments').insert([newComment]).select();
            
            if (error) throw error;
            if (data) setComments([...comments, data[0]]);
        }
    } catch (error) {
        console.error("Erro ao salvar comentário:", error);
        // Fallback local se der erro no banco
        setComments([...comments, { id: Date.now(), x: tempPin.x, y: tempPin.y, text: newCommentText }]);
    }

    setTempPin(null);
    setShowFeedbackModal(false);
    setNewCommentText('');
    if (mediaType === 'video') videoRef.current?.play();
  };

  const handleMediaClick = (e) => {
    // Impede clique se for nas zonas de UI (botoes, barras)
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
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row text-gray-800 font-sans overflow-hidden">
      
      {/* === SIDEBAR (Editor) === */}
      <div className={`w-full md:w-96 bg-white border-r p-6 flex flex-col h-screen overflow-y-auto z-40 ${mode === 'client' ? 'hidden md:flex' : ''}`}>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-6">Visual Social</h1>
        
        {mode === 'creator' ? (
          <div className="space-y-6">
            <div>
               <label className="block text-sm font-medium mb-2 text-gray-700">Arquivo de Mídia</label>
               <label className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'bg-gray-50 border-gray-300' : 'border-purple-200 hover:bg-purple-50 hover:border-purple-400'}`}>
                  {isUploading ? <span className="text-purple-600 font-bold animate-pulse text-sm">Enviando...</span> : (
                    <>
                      <Upload className="text-purple-500 mb-2 w-6 h-6" />
                      <span className="text-sm text-gray-600 font-medium">Trocar Vídeo/Foto</span>
                    </>
                  )}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
               </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Legenda</label>
              <textarea 
                className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" 
                rows="4"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            <button onClick={() => setMode('client')} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2">
              <Smartphone size={18} />
              Ver no "Celular"
            </button>
            
            <div className="text-xs text-gray-400 mt-4 border-t pt-4">
              <p>Dica: No modo cliente, clique na tela para adicionar comentários.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full justify-center space-y-4">
             <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-purple-900 text-sm">
                <p className="font-bold mb-1">Modo Cliente Ativo</p>
                <p>Esta é a visualização que o seu cliente terá. Ele pode clicar em qualquer ponto para deixar feedback.</p>
             </div>
            <button onClick={() => setMode('creator')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
              <ChevronLeft size={18} />
              Voltar para Edição
            </button>
          </div>
        )}
      </div>

      {/* === ÁREA DE PREVIEW (Celular) === */}
      <div className="flex-1 flex items-center justify-center relative bg-[#121212] p-4 h-screen">
        
        {/* MOLDURA DO IPHONE */}
        <div className="relative bg-black w-[380px] h-[800px] rounded-[3rem] border-[8px] border-gray-800 shadow-2xl overflow-hidden ring-1 ring-gray-700 flex flex-col">
           
           {/* 1. BARRA DE STATUS (Topo) */}
           <div className="absolute top-0 left-0 right-0 h-12 z-30 flex items-end justify-between px-6 pb-2 text-white font-medium text-xs pointer-events-none bg-gradient-to-b from-black/60 to-transparent">
              <span>9:41</span>
              <div className="flex gap-1.5 items-center">
                <Signal className="w-3.5 h-3.5 fill-white" />
                <Wifi className="w-3.5 h-3.5" />
                <Battery className="w-4 h-4 fill-white" />
              </div>
           </div>

           {/* 2. ABAS (Seguindo | Para Você) */}
           <div className="absolute top-12 left-0 right-0 z-30 flex justify-center gap-4 text-white font-semibold text-[15px] drop-shadow-md pointer-events-none">
              <span className="opacity-60">Seguindo</span>
              <span className="relative after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-[2px] after:bg-white">Para Você</span>
              <Search className="absolute right-5 w-5 h-5" />
           </div>

           {/* === CONTEÚDO PRINCIPAL (Mídia) === */}
           <div className="flex-1 relative bg-gray-900 cursor-pointer group" onClick={handleMediaClick}>
              {mediaType === 'video' ? (
                <video ref={videoRef} src={mediaUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
              ) : (
                <img src={mediaUrl} className="w-full h-full object-cover" />
              )}
              
              {/* Sombra Inferior para Legibilidade */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent via-black/10 to-black/80 pointer-events-none"></div>

              {/* Ações Laterais (Direita) */}
              <div className="absolute right-3 bottom-4 flex flex-col gap-5 items-center z-20 no-click-zone pb-2">
                 <div className="flex flex-col items-center gap-1">
                    <Heart className="w-8 h-8 text-white stroke-2 drop-shadow-sm hover:scale-110 transition-transform" />
                    <span className="text-white text-[13px] font-medium">84.2K</span>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                    <MessageCircle className="w-8 h-8 text-white stroke-2 drop-shadow-sm hover:scale-110 transition-transform" />
                    <span className="text-white text-[13px] font-medium">1.8K</span>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                       <Send className="w-5 h-5 text-white stroke-2 -rotate-45 ml-0.5 fill-white" />
                    </div>
                    <span className="text-white text-[13px] font-medium">Env.</span>
                 </div>
                 <MoreHorizontal className="w-7 h-7 text-white stroke-2 my-2" />
                 
                 {/* Disco de Vinil */}
                 <div className="w-10 h-10 bg-gray-800 rounded-full border-[3px] border-gray-900 overflow-hidden animate-[spin_5s_linear_infinite] mt-2 ring-1 ring-white/30">
                    <div className="w-full h-full bg-gradient-to-tr from-yellow-500 to-red-500"></div>
                 </div>
              </div>

              {/* Informações do Post (Esquerda Inferior) */}
              <div className="absolute left-4 bottom-4 right-16 z-20 text-white pointer-events-none text-left">
                 <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-[15px] drop-shadow-md">{username}</span>
                    <div className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-semibold border border-white/10">Seguir</div>
                 </div>
                 <p className="text-[14px] leading-snug drop-shadow-md mb-2 font-light text-white/90 line-clamp-2">
                    {caption}
                 </p>
                 <div className="flex items-center gap-2 opacity-90">
                    <Music2 className="w-3 h-3" />
                    <span className="text-xs font-medium">Som Original - {username}</span>
                 </div>
              </div>

              {/* Marcadores de Comentário (Pins) */}
              {comments.map((c) => (
                <div key={c.id} className="absolute group z-30" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                  <div className="w-7 h-7 bg-orange-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-white text-[10px] font-bold animate-in zoom-in duration-300 cursor-pointer hover:scale-125 transition-transform">
                    !
                  </div>
                  <div className="absolute left-5 top-0 bg-white/95 text-gray-800 p-2.5 rounded-xl shadow-xl text-xs w-40 hidden group-hover:block pointer-events-none animate-in fade-in slide-in-from-left-2 z-40">
                    <p className="font-bold text-[10px] text-purple-600 uppercase mb-0.5">Feedback</p>
                    {c.text}
                  </div>
                </div>
              ))}
           </div>

           {/* 3. BARRA DE PROGRESSO (Fina) */}
           <div className="h-0.5 bg-white/20 w-full z-30">
              <div className="h-full bg-white w-1/3"></div>
           </div>

           {/* 4. MENU INFERIOR (Bottom Bar) */}
           <div className="h-14 bg-black text-white flex justify-between items-center px-6 z-30 border-t border-white/10 no-click-zone">
              <div className="flex flex-col items-center gap-0.5 opacity-100 cursor-pointer">
                 <Home className="w-6 h-6 stroke-[2.5]" />
                 <span className="text-[9px] font-medium">Início</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                 <Search className="w-6 h-6" />
                 <span className="text-[9px] font-medium">Amigos</span>
              </div>
              
              {/* Botão Central (+) */}
              <div className="w-10 h-7 bg-gradient-to-r from-cyan-400 to-red-500 rounded-lg flex items-center justify-center px-1 cursor-pointer hover:opacity-90">
                 <div className="w-full h-full bg-white rounded flex items-center justify-center">
                    <PlusSquare className="text-black w-4 h-4 fill-black" />
                 </div>
              </div>

              <div className="flex flex-col items-center gap-0.5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                 <MessageCircle className="w-6 h-6" />
                 <span className="text-[9px] font-medium">Entrada</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                 <User className="w-6 h-6" />
                 <span className="text-[9px] font-medium">Perfil</span>
              </div>
           </div>
           
           {/* 5. HOME INDICATOR (Barrinha do iPhone) */}
           <div className="h-5 bg-black flex justify-center items-start pt-1.5 z-30">
              <div className="w-[130px] h-1.5 bg-white/40 rounded-full"></div>
           </div>

           {/* MODAL DE FEEDBACK (Oculto até clicar) */}
           {showFeedbackModal && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={(e)=>e.stopPropagation()}>
                 <div className="bg-white p-5 rounded-2xl shadow-2xl max-w-[85%] w-full transform transition-all">
                    <h3 className="mb-2 font-bold text-gray-800 text-sm">Adicionar Nota</h3>
                    <textarea 
                       autoFocus 
                       className="w-full border border-gray-200 rounded-xl p-3 mb-3 text-sm focus:border-black focus:ring-0 outline-none bg-gray-50 text-black" 
                       rows="2"
                       placeholder="O que precisa ajustar?"
                       value={newCommentText} 
                       onChange={e=>setNewCommentText(e.target.value)} 
                    />
                    <div className="flex gap-2">
                      <button onClick={saveComment} className="bg-black text-white flex-1 py-2 rounded-lg text-sm font-semibold">Salvar</button>
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