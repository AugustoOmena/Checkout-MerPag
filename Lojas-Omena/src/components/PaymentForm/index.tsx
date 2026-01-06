import { useEffect, useRef, useState } from 'react';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import './styles.css';

// Interfaces para tipagem
interface IdentificationType {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  payment_type_id: string;
  settings: any[]; // Configurações de validação (tamanho do cartão, etc)
  additional_info_needed: string[];
  issuer: any;
}

export function PaymentForm() {
  // --- STATES (O "Coração" reativo do componente) ---
  const [identificationTypes, setIdentificationTypes] = useState<IdentificationType[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [issuers, setIssuers] = useState<any[]>([]); // Preparando para o próximo passo
  const [installments, setInstallments] = useState<any[]>([]); // Preparando para o próximo passo

  // --- REFS (Instâncias que não precisam gerar renderização) ---
  const cardNumberRef = useRef<any>(null);
  const expirationDateRef = useRef<any>(null);
  const securityCodeRef = useRef<any>(null);
  const initializationRef = useRef(false);
  const currentBinRef = useRef<string>(''); // Substitui o 'let currentBin'

  useEffect(() => {
    const initializeMercadoPago = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      await loadMercadoPago();
      const mp = new (window as any).MercadoPago('TEST-33d77029-c5e0-425f-b848-606ac9a9264f');

      // 1. Monta os campos
      cardNumberRef.current = mp.fields.create('cardNumber', {
        placeholder: "Número do cartão"
      }).mount('form-checkout__cardNumber');

      expirationDateRef.current = mp.fields.create('expirationDate', {
        placeholder: "MM/YY",
      }).mount('form-checkout__expirationDate');

      securityCodeRef.current = mp.fields.create('securityCode', {
        placeholder: "Código de segurança"
      }).mount('form-checkout__securityCode');

      // 2. Busca tipos de documento
      try {
        const types = await mp.getIdentificationTypes();
        setIdentificationTypes(types);
      } catch (e) {
        console.error('Erro ao buscar tipos de documento:', e);
      }

      // 3. Lógica de "Bin Change" (NOVA ETAPA)
      // Aqui traduzimos o evento 'binChange' da documentação para React
      cardNumberRef.current.on('binChange', async (data: any) => {
        const { bin } = data;

        try {
          // Caso 1: Usuário apagou o cartão (bin vazio)
          if (!bin && paymentMethodId) {
            setPaymentMethodId('');
            setIssuers([]); // Limpa selects (substitui clearSelectsAndSetPlaceholders)
            setInstallments([]); 
          }

          // Caso 2: Bin mudou (usuário digitou novos números)
          if (bin && bin !== currentBinRef.current) {
            // Busca qual é a bandeira (Visa, Master, etc.)
            const { results } = await mp.getPaymentMethods({ bin });
            const paymentMethod = results[0];

            if (paymentMethod) {
              setPaymentMethodId(paymentMethod.id);
              
              // Chama as funções auxiliares
              updatePCIFieldsSettings(paymentMethod);
              await updateIssuer(mp, paymentMethod, bin);
              await updateInstallments(mp, paymentMethod, bin);
            }
          }

          // Atualiza o cache do BIN
          currentBinRef.current = bin;

        } catch (e) {
          console.error('Erro ao obter payment methods:', e);
        }
      });
    };

    // --- FUNÇÕES AUXILIARES ---

    // Atualiza as configurações de segurança dos campos (ex: CVV de 4 dígitos para Amex)
    function updatePCIFieldsSettings(paymentMethod: PaymentMethod) {
      const { settings } = paymentMethod;

      if (settings && settings[0]) {
        const cardNumberSettings = settings[0].card_number;
        cardNumberRef.current.update({
          settings: cardNumberSettings
        });

        const securityCodeSettings = settings[0].security_code;
        securityCodeRef.current.update({
          settings: securityCodeSettings
        });
      }
    }

    // Placeholder para o Próximo Passo: Obter Emissor
    async function updateIssuer(mp: any, paymentMethod: any, bin: string) {
      // Implementaremos na próxima etapa
      console.log('Buscando emissor para:', paymentMethod.id);
    }

    // Placeholder para o Próximo Passo: Obter Parcelas
    async function updateInstallments(mp: any, paymentMethod: any, bin: string) {
      // Implementaremos na próxima etapa
      console.log('Buscando parcelas para:', bin);
    }

    initializeMercadoPago();

    // Cleanup
    return () => {
      // Limpeza manual do DOM se necessário
      initializationRef.current = false;
    };
  }, []); // Dependências vazias = roda apenas uma vez no mount

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
        {/* Futuro map de issuers aqui */}
      </select>

      <select id="form-checkout__installments" name="installments" defaultValue="">
        <option value="" disabled>Parcelas</option>
        {/* Futuro map de installments aqui */}
      </select>

      <select id="form-checkout__identificationType" name="identificationType" defaultValue="">
        <option value="" disabled>Tipo de documento</option>
        {identificationTypes.map((type) => (
          <option key={type.id} value={type.id}>{type.name}</option>
        ))}
      </select>

      <input type="text" id="form-checkout__identificationNumber" name="identificationNumber" placeholder="Número do documento" />
      <input type="email" id="form-checkout__email" name="email" placeholder="E-mail" />

      {/* Inputs Hidden controlados pelo State agora */}
      <input id="token" name="token" type="hidden" />
      <input 
        id="paymentMethodId" 
        name="paymentMethodId" 
        type="hidden" 
        value={paymentMethodId} // Controlado pelo React
      /> 
      <input id="transactionAmount" name="transactionAmount" type="hidden" value="100" />
      <input id="description" name="description" type="hidden" value="Nome do Produto" />

      <button type="submit" id="form-checkout__submit">Pagar</button>
    </form>
  );
}