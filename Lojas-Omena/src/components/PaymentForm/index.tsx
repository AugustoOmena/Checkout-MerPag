import { useEffect, useRef, useState } from 'react';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import './styles.css';

// Interface para definir o formato do dado que vem do Mercado Pago
interface IdentificationType {
  id: string;
  name: string;
}

export function PaymentForm() {
  // State para armazenar a lista de documentos (CPF, CNPJ, etc.)
  // Clean Code: Separação de dados (state) da visualização (JSX)
  const [identificationTypes, setIdentificationTypes] = useState<IdentificationType[]>([]);

  const cardNumberRef = useRef<any>(null);
  const expirationDateRef = useRef<any>(null);
  const securityCodeRef = useRef<any>(null);
  const initializationRef = useRef(false);

  useEffect(() => {
    const initializeMercadoPago = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      await loadMercadoPago();
      const mp = new (window as any).MercadoPago('TEST-33d77029-c5e0-425f-b848-606ac9a9264f');

      // 1. Monta os campos (Passo anterior)
      cardNumberRef.current = mp.fields.create('cardNumber', {
        placeholder: "Número do cartão"
      }).mount('form-checkout__cardNumber');

      expirationDateRef.current = mp.fields.create('expirationDate', {
        placeholder: "MM/YY",
      }).mount('form-checkout__expirationDate');

      securityCodeRef.current = mp.fields.create('securityCode', {
        placeholder: "Código de segurança"
      }).mount('form-checkout__securityCode');

      // 2. Obter tipos de documento (NOVO PASSO)
      // Fiel à doc: chamamos mp.getIdentificationTypes()
      // Clean Code: Salvamos no state em vez de injetar HTML na mão
      try {
        const types = await mp.getIdentificationTypes();
        setIdentificationTypes(types);
      } catch (e) {
        console.error('Erro ao buscar tipos de documento:', e);
      }
    };

    initializeMercadoPago();

    return () => {
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
      <div id="form-checkout__cardNumber" className="container"></div>
      <div id="form-checkout__expirationDate" className="container"></div>
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

      {/* NOVO PASSO: Select populado dinamicamente pelo React 
        Isso substitui a função 'createSelectOptions' da documentação
      */}
      <select id="form-checkout__identificationType" name="identificationType" defaultValue="">
        <option value="" disabled>Tipo de documento</option>
        {identificationTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
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

      <input id="token" name="token" type="hidden" />
      <input id="paymentMethodId" name="paymentMethodId" type="hidden" />
      <input id="transactionAmount" name="transactionAmount" type="hidden" value="100" />
      <input id="description" name="description" type="hidden" value="Nome do Produto" />

      <button type="submit" id="form-checkout__submit">Pagar</button>
    </form>
  );
}