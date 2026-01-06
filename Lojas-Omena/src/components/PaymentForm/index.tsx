import { useEffect, useRef } from 'react';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import './styles.css';

export function PaymentForm() {
  // Refs para guardar as instâncias dos campos do Mercado Pago
  const cardNumberRef = useRef<any>(null);
  const expirationDateRef = useRef<any>(null);
  const securityCodeRef = useRef<any>(null);
  
  // Ref para garantir que a inicialização ocorra apenas uma vez (React Strict Mode)
  const initializationRef = useRef(false);

  useEffect(() => {
    // Função assíncrona para carregar o SDK e montar os campos
    const initializeMercadoPago = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      await loadMercadoPago();
      
      // Inicializa a instância do MP
      const mp = new (window as any).MercadoPago('TEST-33d77029-c5e0-425f-b848-606ac9a9264f');

      // 1. Cria e monta o campo do Número do Cartão
      cardNumberRef.current = mp.fields.create('cardNumber', {
        placeholder: "Número do cartão"
      }).mount('form-checkout__cardNumber');

      // 2. Cria e monta o campo de Data de Validade
      expirationDateRef.current = mp.fields.create('expirationDate', {
        placeholder: "MM/YY",
      }).mount('form-checkout__expirationDate');

      // 3. Cria e monta o campo de Código de Segurança
      securityCodeRef.current = mp.fields.create('securityCode', {
        placeholder: "Código de segurança"
      }).mount('form-checkout__securityCode');
    };

    initializeMercadoPago();

    // Função de limpeza (Clean Code: sempre limpar o que criamos)
    return () => {
      // O SDK do MP não tem um método "unmount" oficial documentado publicamente
      // de forma simples, mas limpar o innerHTML dos containers previne duplicação visual
      // caso o componente seja desmontado e montado novamente.
      const ids = ['form-checkout__cardNumber', 'form-checkout__expirationDate', 'form-checkout__securityCode'];
      ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '';
      });
      initializationRef.current = false;
    };
  }, []);

  return (
    <form id="form-checkout">
      {/* Container: Número do Cartão */}
      <div id="form-checkout__cardNumber" className="container"></div>

      {/* Container: Data de Validade */}
      <div id="form-checkout__expirationDate" className="container"></div>

      {/* Container: CVV */}
      <div id="form-checkout__securityCode" className="container"></div>

      <input 
        type="text" 
        id="form-checkout__cardholderName" 
        placeholder="Titular do cartão" 
      />

      <select id="form-checkout__issuer" name="issuer" defaultValue="">
        <option value="" disabled>Banco emissor</option>
      </select>

      <select id="form-checkout__installments" name="installments" defaultValue="">
        <option value="" disabled>Parcelas</option>
      </select>

      <select id="form-checkout__identificationType" name="identificationType" defaultValue="">
        <option value="" disabled>Tipo de documento</option>
      </select>

      <input 
        type="text" 
        id="form-checkout__identificationNumber" 
        name="identificationNumber" 
        placeholder="Número do documento" 
      />

      <input 
        type="email" 
        id="form-checkout__email" 
        name="email" 
        placeholder="E-mail" 
      />

      {/* Inputs hidden */}
      <input id="token" name="token" type="hidden" />
      <input id="paymentMethodId" name="paymentMethodId" type="hidden" />
      <input id="transactionAmount" name="transactionAmount" type="hidden" value="100" />
      <input id="description" name="description" type="hidden" value="Nome do Produto" />

      <button type="submit" id="form-checkout__submit">Pagar</button>
    </form>
  );
}