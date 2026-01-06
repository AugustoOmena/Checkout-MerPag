import './styles.css';

export function PaymentForm() {
  return (
    <form id="form-checkout">
      {/* Container onde o MP vai montar o número do cartão */}
      <div id="form-checkout__cardNumber" className="container"></div>

      {/* Container onde o MP vai montar a data de validade */}
      <div id="form-checkout__expirationDate" className="container"></div>

      {/* Container onde o MP vai montar o código de segurança (CVV) */}
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

      {/* Inputs ocultos que o script original usava. 
          No React vamos usar State depois, mas mantenha-os por enquanto 
          para seguir a lógica da documentação visualmente. */}
      <input id="token" name="token" type="hidden" />
      <input id="paymentMethodId" name="paymentMethodId" type="hidden" />
      <input id="transactionAmount" name="transactionAmount" type="hidden" value="100" />
      <input id="description" name="description" type="hidden" value="Nome do Produto" />

      <button type="submit" id="form-checkout__submit">Pagar</button>
    </form>
  );
}