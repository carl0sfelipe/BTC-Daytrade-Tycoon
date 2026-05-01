/**
 * ChatGPT Conversation Extractor
 * Script para extrair conversas grandes do ChatGPT diretamente no console
 * 
 * INSTRUÇÕES:
 * 1. Abra a conversa no ChatGPT que deseja extrair
 * 2. Abra o console do navegador (F12 > Console)
 * 3. Cole este script inteiro e pressione Enter
 * 4. Use a interface que aparece para baixar ou copiar o texto
 */

(function() {
  'use strict';

  console.log('🚀 ChatGPT Extractor iniciado...');

  // Função para extrair mensagens
  async function extractConversation() {
    console.log('📋 Extraindo mensagens...');
    
    // Seletores para diferentes layouts do ChatGPT
    const selectors = [
      '[data-message-author-role]',
      '.text-message',
      '[data-testid^="conversation-turn-"]',
      '.group.w-full',
      '.message',
      '[class*="message"]'
    ];
    
    let messages = [];
    let usedSelector = '';
    
    // Tenta cada seletor
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Encontrados ${elements.length} elementos com: ${selector}`);
        usedSelector = selector;
        
        elements.forEach((el, index) => {
          // Determina o autor
          let role = 'unknown';
          const roleAttr = el.getAttribute('data-message-author-role');
          if (roleAttr) {
            role = roleAttr;
          } else if (el.textContent.includes('ChatGPT') || el.textContent.includes('Assistant')) {
            role = 'assistant';
          } else if (index % 2 === 0) {
            role = 'user';
          }
          
          // Extrai o texto
          const textContent = el.innerText || el.textContent || '';
          if (textContent.trim().length > 0) {
            messages.push({
              role: role,
              content: textContent.trim(),
              index: index
            });
          }
        });
        
        if (messages.length > 0) break;
      }
    }
    
    if (messages.length === 0) {
      // Fallback: tenta extrair todo o texto da página
      console.log('⚠️ Usando método fallback...');
      const article = document.querySelector('main') || document.body;
      const text = article.innerText || article.textContent;
      messages = [{
        role: 'conversation',
        content: text,
        index: 0
      }];
    }
    
    console.log(`✅ Total de mensagens extraídas: ${messages.length}`);
    return messages;
  }

  // Função para formatar como texto
  function formatAsText(messages) {
    let output = '';
    output += '='.repeat(80) + '\n';
    output += 'CONVERSA CHATGPT EXTRAÍDA\n';
    output += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
    output += `URL: ${window.location.href}\n`;
    output += `Total de mensagens: ${messages.length}\n`;
    output += '='.repeat(80) + '\n\n';
    
    messages.forEach((msg, idx) => {
      const author = msg.role === 'user' ? '👤 USUÁRIO' : 
                    msg.role === 'assistant' ? '🤖 ASSISTENTE' : 
                    '📝 MENSAGEM';
      output += `${author}:\n`;
      output += '-'.repeat(80) + '\n';
      output += `${msg.content}\n`;
      output += '\n';
    });
    
    output += '\n' + '='.repeat(80) + '\n';
    output += 'FIM DA CONVERSA\n';
    output += '='.repeat(80) + '\n';
    
    return output;
  }

  // Função para dividir em chunks gerenciáveis
  function splitIntoChunks(text, maxSize = 500000) {
    const chunks = [];
    let currentChunk = '';
    const lines = text.split('\n');
    
    for (const line of lines) {
      if ((currentChunk + line).length > maxSize) {
        chunks.push(currentChunk);
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  // Função para copiar para clipboard em partes
  async function copyInParts(text) {
    const chunks = splitIntoChunks(text, 100000); // 100KB por parte
    console.log(`📋 Texto dividido em ${chunks.length} partes`);
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`\n📋 PARTE ${i + 1} DE ${chunks.length}:`);
      console.log('='.repeat(80));
      console.log(chunks[i]);
      console.log('='.repeat(80));
      
      try {
        await navigator.clipboard.writeText(chunks[i]);
        console.log(`✅ Parte ${i + 1} copiada para a área de transferência!`);
        
        if (i < chunks.length - 1) {
          console.log(`⏳ Aguarde 2 segundos para a próxima parte...`);
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err) {
        console.error(`❌ Erro ao copiar parte ${i + 1}:`, err);
      }
    }
    
    return chunks;
  }

  // Função para salvar como arquivo
  function downloadAsFile(text, filename = null) {
    if (!filename) {
      const date = new Date().toISOString().split('T')[0];
      const convId = window.location.pathname.split('/').pop() || 'conversa';
      filename = `chatgpt-${convId}-${date}.txt`;
    }
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`💾 Arquivo salvo: ${filename}`);
    return filename;
  }

  // Cria interface visual
  function createUI(text) {
    // Remove interface anterior se existir
    const oldUI = document.getElementById('chatgpt-extractor-ui');
    if (oldUI) oldUI.remove();
    
    const ui = document.createElement('div');
    ui.id = 'chatgpt-extractor-ui';
    ui.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      background: white;
      border: 2px solid #10a37f;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333;
    `;
    
    const sizeMB = (text.length / 1024 / 1024).toFixed(2);
    
    ui.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0; color: #10a37f; font-size: 18px;">📋 ChatGPT Extractor</h3>
        <button id="close-extractor" style="background: none; border: none; font-size: 20px; cursor: pointer; padding: 0; width: 30px; height: 30px;">×</button>
      </div>
      
      <div style="background: #f7f7f8; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 14px; line-height: 1.5;">
        <strong>Tamanho:</strong> ${text.length.toLocaleString()} caracteres<br>
        <strong>(${sizeMB} MB)</strong>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button id="btn-download" style="
          background: #10a37f;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">
          💾 Salvar como Arquivo (.txt)
        </button>
        
        <button id="btn-copy" style="
          background: #fff;
          color: #10a37f;
          border: 2px solid #10a37f;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">
          📋 Copiar em Partes
        </button>
        
        <button id="btn-preview" style="
          background: #f7f7f8;
          color: #333;
          border: 1px solid #d9d9d9;
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
        ">
          👁️ Pré-visualizar (primeiros 1000 chars)
        </button>
      </div>
      
      <div id="preview-area" style="margin-top: 15px; display: none;">
        <textarea readonly style="width: 100%; height: 150px; font-size: 11px; padding: 8px; border: 1px solid #d9d9d9; border-radius: 6px; resize: vertical;">${text.substring(0, 1000).replace(/</g, '&lt;')}...</textarea>
      </div>
      
      <div style="margin-top: 15px; padding: 10px; background: #e6f4ea; border-radius: 6px; font-size: 12px; color: #1e8e3e;">
        💡 <strong>Dica:</strong> Salve o arquivo e depois use-o na página de predições do Oraculum para fazer resumos ou análises.
      </div>
    `;
    
    document.body.appendChild(ui);
    
    // Event listeners
    document.getElementById('close-extractor').onclick = () => ui.remove();
    document.getElementById('btn-download').onclick = () => {
      downloadAsFile(text);
      document.getElementById('btn-download').textContent = '✅ Download iniciado!';
    };
    document.getElementById('btn-copy').onclick = async () => {
      const btn = document.getElementById('btn-copy');
      btn.textContent = '⏳ Copiando...';
      await copyInParts(text);
      btn.textContent = '✅ Copiado!';
    };
    document.getElementById('btn-preview').onclick = () => {
      const preview = document.getElementById('preview-area');
      preview.style.display = preview.style.display === 'none' ? 'block' : 'none';
    };
  }

  // Execução principal
  async function main() {
    console.clear();
    console.log('%c🚀 ChatGPT Extractor', 'font-size: 24px; font-weight: bold; color: #10a37f;');
    console.log('%cIniciando extração...', 'color: #666;');
    
    const messages = await extractConversation();
    const formattedText = formatAsText(messages);
    
    createUI(formattedText);
    
    // Disponibiliza globalmente
    window.chatgptExtractor = {
      text: formattedText,
      messages: messages,
      download: () => downloadAsFile(formattedText),
      copy: () => copyInParts(formattedText),
      stats: {
        characters: formattedText.length,
        messages: messages.length
      }
    };
    
    console.log('\n✅ Extração concluída!');
    console.log(`📊 ${formattedText.length.toLocaleString()} caracteres extraídos`);
    console.log('\n💡 Interface aberta no canto superior direito');
    console.log('💡 Ou use: window.chatgptExtractor.download()');
    
    return formattedText;
  }

  // Inicia
  return main();
})();
