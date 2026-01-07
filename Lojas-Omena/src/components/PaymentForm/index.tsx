import { useEffect, useRef, useState } from 'react';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import './styles.css';

// --- INTERFACES ---
interface IdentificationType {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  payment_type_id: string;
  settings: any[];
  additional_info_needed: string[];
  issuer: any;
}

interface Issuer {
  id: string;
  name: string;
}

interface PayerCost {
  installments: number;
  recommended_message: string;
}

// Interface para os dados do formulário (Clean Code)
interface FormData {
  cardholderName: string;
  identificationType: string;
  identificationNumber: string;
  email: string;
  issuer: string;
  installments: string;
}

export function PaymentForm() {
  const transactionAmount = "100";

  // --- STATES ---
  const [identificationTypes, setIdentificationTypes] = useState<IdentificationType[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [installmentOptions, setInstallmentOptions] = useState<PayerCost[]>([]);
  
  // State único para os inputs do formulário
  const [formData, setFormData] = useState<FormData>({
    cardholderName: '',
    identificationType: '',
    identificationNumber: '',
    email: '',
    issuer: '',
    installments: ''
  });

  // --- REFS ---
  const mpRef = useRef<any>(null); // Guardamos a instância do MP aqui
  const cardNumberRef = useRef<any>(null);
  const expirationDateRef = useRef<any>(null);
  const securityCodeRef = useRef<any>(null);
  const initializationRef = useRef(false);
  const currentBinRef = useRef<string>('');

  useEffect(() => {
    const initializeMercadoPago = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      await loadMercadoPago();
      // Salvamos no Ref para usar no submit depois
      mpRef.current = new (window as any).MercadoPago('TEST-33d77029-c5e0-425f-b848-606ac9a9264f');

      // 1. Monta os campos
      cardNumberRef.current = mpRef.current.fields.create('cardNumber', {
        placeholder: "Número do cartão"
      }).mount('form-checkout__cardNumber');

      expirationDateRef.current = mpRef.current.fields.create('expirationDate', {
        placeholder: "MM/YY",
      }).mount('form-checkout__expirationDate');

      securityCodeRef.current = mpRef.current.fields.create('securityCode', {
        placeholder: "Código de segurança"
      }).mount('form-checkout__securityCode');

      // 2. Busca tipos de documento
      try {
        const types = await mpRef.current.getIdentificationTypes();
        setIdentificationTypes(types);
      } catch (e) {
        console.error('Erro ao buscar tipos de documento:', e);
      }

      // 3. Listener de BIN Change
      cardNumberRef.current.on('binChange', async (data: any) => {
        const { bin } = data;
        try {
          if (!bin && paymentMethodId) {
            setPaymentMethodId('');
            setIssuers([]);
            setInstallmentOptions([]);
          }

          if (bin && bin !== currentBinRef.current) {
            const { results } = await mpRef.current.getPaymentMethods({ bin });
            const paymentMethod = results[0];

            if (paymentMethod) {
              setPaymentMethodId(paymentMethod.id);
              updatePCIFieldsSettings(paymentMethod);
              await updateIssuer(mpRef.current, paymentMethod, bin);
              await updateInstallments(mpRef.current, paymentMethod, bin);
            }
          }
          currentBinRef.current = bin;
        } catch (e) {
          console.error('Erro ao obter payment methods:', e);
        }
      });
    };

    function updatePCIFieldsSettings(paymentMethod: PaymentMethod) {
      const { settings } = paymentMethod;
      if (settings && settings[0]) {
        cardNumberRef.current.update({ settings: settings[0].card_number });
        securityCodeRef.current.update({ settings: settings[0].security_code });
      }
    }

    async function updateIssuer(mp: any, paymentMethod: PaymentMethod, bin: string) {
      const { additional_info_needed, issuer } = paymentMethod;
      let issuerOptions: Issuer[] = [issuer];
      if (additional_info_needed && additional_info_needed.includes('issuer_id')) {
        issuerOptions = await getIssuers(mp, paymentMethod, bin);
      }
      setIssuers(issuerOptions);
    }

    async function getIssuers(mp: any, paymentMethod: PaymentMethod, bin: string) {
      try {
        const { id: paymentMethodId } = paymentMethod;
        return await mp.getIssuers({ paymentMethodId, bin });
      } catch (e) {
        console.error('error getting issuers: ', e);
        return [];
      }
    }

    async function updateInstallments(mp: any, _paymentMethod: any, bin: string) {
      try {
        const installments = await mp.getInstallments({
          amount: transactionAmount,
          bin,
          paymentTypeId: 'credit_card'
        });
        setInstallmentOptions(installments[0].payer_costs);
      } catch (error) {
        console.error('error getting installments: ', error);
      }
    }

    initializeMercadoPago();

    return () => {
      initializationRef.current = false;
    };
  }, []);

  // --- HANDLERS (Funções de Controle) ---

  // Atualiza o state formData quando o usuário digita
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      if (!mpRef.current) return;

      // 1. Cria o Token (Client-side)
      const token = await mpRef.current.fields.createCardToken({
        cardholderName: formData.cardholderName,
        identificationType: formData.identificationType,
        identificationNumber: formData.identificationNumber,
      });

      console.log('Token criado:', token.id);

      // 2. Prepara o Payload para sua Lambda
      const backendPayload = {
        token: token.id,
        paymentMethodId: paymentMethodId,
        transactionAmount: transactionAmount,
        installments: formData.installments,
        issuer: formData.issuer,
        email: formData.email,
        identificationType: formData.identificationType,
        identificationNumber: formData.identificationNumber
      };

      // 3. Envia para o Backend (Server-side)
      // SUBSTITUA PELA URL DA SUA LAMBDA
      const LAMBDA_URL = "https://sua-url-lambda-aqui.lambda-url.us-east-1.on.aws/";
      
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendPayload),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Pagamento Criado com Sucesso!', data);
        alert(`Pagamento Aprovado! ID: ${data.id}\nStatus: ${data.status}`);
      } else {
        console.error('Erro no pagamento:', data);
        alert(`Erro ao processar pagamento: ${JSON.stringify(data)}`);
      }

    } catch (e) {
      console.error('Erro geral: ', e);
      alert('Ocorreu um erro ao processar sua solicitação.');
    }
  };

  return (
    <form id="form-checkout" onSubmit={handleSubmit}>
      <div id="form-checkout__cardNumber" className="container"></div>
      <div id="form-checkout__expirationDate" className="container"></div>
      <div id="form-checkout__securityCode" className="container"></div>

      <input 
        type="text" 
        id="form-checkout__cardholderName" 
        name="cardholderName" // Name igual à chave do state
        placeholder="Titular do cartão" 
        value={formData.cardholderName}
        onChange={handleInputChange}
      />

      <select 
        id="form-checkout__issuer" 
        name="issuer" 
        value={formData.issuer}
        onChange={handleInputChange}
      >
        <option value="" disabled>Banco emissor</option>
        {issuers.map((issuer) => (
          <option key={issuer.id} value={issuer.id}>{issuer.name}</option>
        ))}
      </select>

      <select 
        id="form-checkout__installments" 
        name="installments" 
        value={formData.installments}
        onChange={handleInputChange}
      >
        <option value="" disabled>Parcelas</option>
        {installmentOptions.map((option) => (
          <option key={option.installments} value={option.installments}>
            {option.recommended_message}
          </option>
        ))}
      </select>

      <select 
        id="form-checkout__identificationType" 
        name="identificationType" 
        value={formData.identificationType}
        onChange={handleInputChange}
      >
        <option value="" disabled>Tipo de documento</option>
        {identificationTypes.map((type) => (
          <option key={type.id} value={type.id}>{type.name}</option>
        ))}
      </select>

      <input 
        type="text" 
        id="form-checkout__identificationNumber" 
        name="identificationNumber" 
        placeholder="Número do documento" 
        value={formData.identificationNumber}
        onChange={handleInputChange}
      />

      <input 
        type="email" 
        id="form-checkout__email" 
        name="email" 
        placeholder="E-mail" 
        value={formData.email}
        onChange={handleInputChange}
      />

      <input id="paymentMethodId" name="paymentMethodId" type="hidden" value={paymentMethodId} />
      <input id="transactionAmount" name="transactionAmount" type="hidden" value={transactionAmount} />
      <input id="description" name="description" type="hidden" value="Nome do Produto" />

      <button type="submit" id="form-checkout__submit">Pagar</button>
    </form>
  );
}