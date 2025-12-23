'use client';

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase'; 
import { Upload } from 'lucide-react';

const DEMO_VIDEO = "https://assets.mixkit.co/videos/preview/mixkit-girl-taking-a-selfie-in-a-field-of-flowers-3444-large.mp4";

export default function App() {
  const [mode, setMode] = useState('creator'); 
  const [mediaType, setMediaType] = useState('video'); 
  const [mediaUrl, setMediaUrl] = useState(DEMO_VIDEO);
  const [caption, setCaption] = useState("Confira as novidades! #novidade");
  
  // Lista de comentários (Vem do banco de dados agora)
  const [comments, setComments] = useState([]);
  
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tempPin, setTempPin] = useState(null); 
  const [newCommentText, setNewCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);

  // --- 1. BUSCAR COMENTÁRIOS NO SUPABASE ---
  useEffect(() => {
    async function fetchComments() {
      // Pede ao Supabase todos os comentários que pertencem a este vídeo (mediaUrl)
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('media_url', mediaUrl);

      if (data) {
        setComments(data);
      }
    }
    fetchComments();
  }, [mediaUrl]); // Roda toda vez que muda o vídeo

  // --- 2. UPLOAD (Já estava funcionando) ---
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
      
      // Limpa os comentários antigos da tela quando troca de vídeo
      setComments([]); 

    } catch (error) {
      console.error('Erro:', error);
      setUploadError('Erro ao subir. Tente um arquivo menor que 50MB.');
    } finally {
      setIsUploading(false);
    }
  };

  // --- 3. SALVAR COMENTÁRIO NO SUPABASE ---
  const saveComment = async () => {
    if (!newCommentText.trim()) return;

    const newComment = { 
      x: tempPin.x, 
      y: tempPin.y, 
      text: newCommentText,
      media_url: mediaUrl // Importante: Salva qual é o vídeo dono do comentário
    };

    // Salva no banco de dados
    const { data, error } = await supabase
      .from('comments')
      .insert([newComment])
      .select();

    if (data) {
      // Atualiza a tela com o comentário que acabou de ser salvo
      setComments([...comments, data[0]]);
    }

    setTempPin(null);
    setShowFeedbackModal(false);
    setNewCommentText('');
    if (mediaType === 'video') setIsPlaying(true);
  };

  const handleMediaClick = (e) => {
    if (mode !== 'client') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (mediaType === 'video') setIsPlaying(false);
    setTempPin({ x, y });
    setShowFeedbackModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-gray-800 font-sans">
      {/* Sidebar */}
      <div className={`w-full md:w-96 bg-white border-r p-6 flex flex-col h-screen overflow-y-auto z-40 ${mode === 'client' ? 'hidden md:flex' : ''}`}>
        <h1 className="text-2xl font-bold text-purple-600 mb-6">Visual Social Cloud</h1>
        
        {mode === 'creator' ? (
          <div className="space-y-6">
            <div>
               <label className="block text-sm font-medium mb-2">Upload (Máx 50MB) ☁️</label>
               <label className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${isUploading ? 'bg-gray-100' : 'border-purple-300 hover:bg-purple-50'}`}>
                  {isUploading ? <span className="text-purple-600 font-bold">Enviando...</span> : (
                    <>
                      <Upload className="text-purple-500 mb-2" />
                      <span className="text-sm text-gray-600">Escolher Arquivo</span>
                    </>
                  )}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="video/*,image/*" disabled={isUploading}/>
               </label>
               {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
            </div>
            <button onClick={() => setMode('client')} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">Ver Como Cliente</button>
          </div>
        ) : (
          <button onClick={() => setMode('creator')} className="w-full bg-gray-200 py-2 rounded">Voltar</button>
        )}
      </div>

      {/* Preview */}
      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
        <div className="relative bg-gray-900 aspect-[9/16] h-[90vh] rounded-[2rem] border-8 border-gray-800 overflow-hidden shadow-2xl">
           <div className="w-full h-full relative cursor-pointer" onClick={handleMediaClick}>
              {mediaType === 'video' ? (
                <video ref={videoRef} src={mediaUrl} className="w-full h-full object-cover" loop muted autoPlay playsInline />
              ) : (
                <img src={mediaUrl} className="w-full h-full object-cover" />
              )}
              
              {/* Renderiza os comentários vindos do banco */}
              {comments.map((c) => (
                <div key={c.id} className="absolute group" style={{left:`${c.x}%`, top:`${c.y}%`}}>
                  <div className="w-6 h-6 bg-orange-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2"></div>
                  {/* Tooltip com o texto */}
                  <div className="absolute left-4 top-0 bg-white p-2 rounded shadow-lg text-xs w-32 hidden group-hover:block z-50">
                    {c.text}
                  </div>
                </div>
              ))}

              {showFeedbackModal && (
                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e)=>e.stopPropagation()}>
                    <div className="bg-white p-4 rounded max-w-xs w-full">
                       <p className="mb-2 font-bold">Comentar:</p>
                       <input autoFocus className="border w-full p-2 mb-2" value={newCommentText} onChange={e=>setNewCommentText(e.target.value)} />
                       <div className="flex gap-2">
                         <button onClick={saveComment} className="bg-orange-500 text-white flex-1 py-1 rounded">Salvar</button>
                         <button onClick={()=>{setShowFeedbackModal(false); setIsPlaying(true)}} className="bg-gray-300 text-gray-700 px-3 py-1 rounded">X</button>
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