import { useEffect, useRef, useState } from 'react';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import './styles.css';

// Interfaces
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
  issuer: any; // O objeto issuer padrão
}

interface Issuer {
  id: string;
  name: string;
}

export function PaymentForm() {
  // --- STATES ---
  const [identificationTypes, setIdentificationTypes] = useState<IdentificationType[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [issuers, setIssuers] = useState<Issuer[]>([]); // Estado para armazenar os emissores
  const [installments, setInstallments] = useState<any[]>([]);

  // --- REFS ---
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

      // 3. Listener de BIN Change
      cardNumberRef.current.on('binChange', async (data: any) => {
        const { bin } = data;

        try {
          if (!bin && paymentMethodId) {
            setPaymentMethodId('');
            setIssuers([]); // Limpa emissores
            setInstallments([]); 
          }

          if (bin && bin !== currentBinRef.current) {
            const { results } = await mp.getPaymentMethods({ bin });
            const paymentMethod = results[0];

            if (paymentMethod) {
              setPaymentMethodId(paymentMethod.id);
              
              updatePCIFieldsSettings(paymentMethod);
              await updateIssuer(mp, paymentMethod, bin); // Agora chama a função real
              await updateInstallments(mp, paymentMethod, bin);
            }
          }

          currentBinRef.current = bin;

        } catch (e) {
          console.error('Erro ao obter payment methods:', e);
        }
      });
    };

    // --- FUNÇÕES AUXILIARES ---

    function updatePCIFieldsSettings(paymentMethod: PaymentMethod) {
      const { settings } = paymentMethod;
      if (settings && settings[0]) {
        cardNumberRef.current.update({ settings: settings[0].card_number });
        securityCodeRef.current.update({ settings: settings[0].security_code });
      }
    }

    // --- IMPLEMENTAÇÃO FIEL À DOCUMENTAÇÃO (Obter Banco Emissor) ---
    async function updateIssuer(mp: any, paymentMethod: PaymentMethod, bin: string) {
      const { additional_info_needed, issuer } = paymentMethod;
      
      // Padrão: usa o emissor que veio no objeto paymentMethod
      let issuerOptions: Issuer[] = [issuer];

      // Se a API pedir 'issuer_id', buscamos a lista completa de emissores
      if (additional_info_needed && additional_info_needed.includes('issuer_id')) {
        issuerOptions = await getIssuers(mp, paymentMethod, bin);
      }

      // Atualiza o State (substitui o createSelectOptions da doc)
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

    // Placeholder para Parcelas (Próximo passo)
    async function updateInstallments(mp: any, paymentMethod: any, bin: string) {
      console.log('Buscando parcelas para:', bin);
    }

    initializeMercadoPago();

    return () => {
      initializationRef.current = false;
    };
  }, []);

  return (
    <form id="form-checkout">
      <div id="form-checkout__cardNumber" className="container"></div>
      <div id="form-checkout__expirationDate" className="container"></div>
      <div id="form-checkout__securityCode" className="container"></div>

      <input type="text" id="form-checkout__cardholderName" placeholder="Titular do cartão" />

      {/* Select de Emissores agora populado pelo State 'issuers' */}
      <select id="form-checkout__issuer" name="issuer" defaultValue="">
        <option value="" disabled>Banco emissor</option>
        {issuers.map((issuer) => (
          <option key={issuer.id} value={issuer.id}>
            {issuer.name}
          </option>
        ))}
      </select>

      <select id="form-checkout__installments" name="installments" defaultValue="">
        <option value="" disabled>Parcelas</option>
      </select>

      <select id="form-checkout__identificationType" name="identificationType" defaultValue="">
        <option value="" disabled>Tipo de documento</option>
        {identificationTypes.map((type) => (
          <option key={type.id} value={type.id}>{type.name}</option>
        ))}
      </select>

      <input type="text" id="form-checkout__identificationNumber" name="identificationNumber" placeholder="Número do documento" />
      <input type="email" id="form-checkout__email" name="email" placeholder="E-mail" />

      {/* Inputs ocultos */}
      <input id="token" name="token" type="hidden" />
      <input id="paymentMethodId" name="paymentMethodId" type="hidden" value={paymentMethodId} />
      <input id="transactionAmount" name="transactionAmount" type="hidden" value="100" />
      <input id="description" name="description" type="hidden" value="Nome do Produto" />

      <button type="submit" id="form-checkout__submit">Pagar</button>
    </form>
  );
}