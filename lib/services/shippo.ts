import { Shippo, Address, Rate, Transaction } from 'shippo'; // Import Shippo class and response types

const shippoToken = process.env.SHIPPO_API_KEY;
let shippoInstance: Shippo | null = null;

if (shippoToken) {
    shippoInstance = new Shippo({ apiKeyHeader: shippoToken });
} else {
    console.error("CRITICAL: Shippo API key (SHIPPO_API_KEY) is not set in environment variables. Shippo functionality will be disabled.");
}

export interface ShippoAddressInput {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string; // ISO 2-letter country code
    phone?: string;
    email?: string;
    isResidential?: boolean; // Changed from is_residential to match SDK
    validate?: boolean; // Request validation
    company?: string;
    metadata?: string; // Added from user example
}

// This interface represents the structure of an address object returned by Shippo API,
// which might be slightly different from ShippoAddressInput.
// Based on Shippo.Address type, but simplified for our use.
export interface ShippoValidatedAddress {
    objectId?: string;
    isComplete?: boolean;
    isValid?: boolean;
    validationResults?: {
        isValid: boolean;
        messages: Array<{ code?: string; text?: string; type?: string; source?: string }>; // Made fields optional
        addressComplete?: boolean;
        isResidential?: boolean;
        isPoBox?: boolean;
    };
    name?: string;
    company?: string;
    street1?: string;
    street2?: string;
    street3?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
    email?: string;
    isResidential?: boolean; // Note: SDK might use isResidential directly on Address or in validationResults
    // Potentially other fields like latitude, longitude, etc.
}


export interface ShippoParcel {
    length: string;
    width: string;
    height: string;
    distanceUnit: 'cm' | 'in' | 'ft' | 'mm' | 'm' | 'yd';
    weight: string;
    massUnit: 'g' | 'oz' | 'lb' | 'kg';
    template?: string;
    metadata?: string;
}

export interface ShippoShipmentRequestData {
    addressFrom: ShippoAddressInput;
    addressTo: ShippoAddressInput;
    parcels: ShippoParcel[] | ShippoParcel;
    shipmentDate?: string;
    async?: boolean;
    carrierAccounts?: string[];
    metadata?: string;
}

// Using Shippo SDK's Rate type directly
export interface AppShippoRate {
    objectId: string;
    amount: string;
    currency: string;
    provider: string;
    providerImage75?: string;
    providerImage200?: string;
    servicelevel: { // Changed to match SDK
        token?: string;
        name?: string;
        terms?: string;
    };
    estimatedDays?: number;
    durationTerms?: string;
    messages?: Array<{ code?: string; text?: string; type?: string; source?: string }>;
    shipment?: string;
    attributes?: string[];
    amountLocal?: string;
    currencyLocal?: string;
    arrivesBy?: string | null;
    carrierAccount?: string;
    test?: boolean;
    zone?: string;
}

export interface ShippoTransactionRequest {
    rate: string; // Shippo rate object_id
    labelFileType?: "PDF" | "PDF_4x6" | "PNG" | "ZPLII";
    metadata?: string;
    async?: boolean;
}

// Using Shippo SDK's Transaction type directly or a mapped version
export interface AppShippoTransaction { // Renamed to avoid conflict
    objectId: string;
    status: "WAITING" | "QUEUED" | "SUCCESS" | "ERROR" | "REFUNDED" | "REFUNDPENDING" | "REFUNDREJECTED";
    rate: string;
    trackingNumber?: string;
    trackingStatus?: string;
    trackingUrlProvider?: string;
    labelUrl?: string;
    commercialInvoiceUrl?: string | null;
    messages?: Array<{ code?: string; text?: string; type?: string; source?: string }>;
    objectState?: "VALID" | "INVALID";
    eta?: string | null;
    parcel?: string;
    order?: string | null;
    metadata?: string;
    test?: boolean;
}


const ShippoService = {
    validateAddress: async (address: ShippoAddressInput): Promise<{
        isValid: boolean;
        correctedAddress: ShippoAddressInput | null;
        messages: string[];
        isResidential?: boolean;
    }> => {
        if (!shippoInstance) {
            throw new Error("Shippo client is not initialized. API key may be missing.");
        }
        try {
            // Map our input to Shippo SDK's expected format
            const addressToValidate = {
                name: address.name,
                company: address.company,
                street1: address.street1,
                street2: address.street2,
                city: address.city,
                state: address.state,
                zip: address.zip,
                country: address.country,
                phone: address.phone,
                email: address.email,
                isResidential: address.isResidential, // Use camelCase
                validate: address.validate === undefined ? true : address.validate,
                metadata: address.metadata,
            };

            const response: Address = await shippoInstance.addresses.create(addressToValidate as any);

            const sdkValidationResults = response.validationResults;
            const validationMessages = sdkValidationResults?.messages?.map(m => m.text || '').filter(text => text) || [];

            // Determine residential status from validation results, then from response, then from input
            let outputIsResidential = sdkValidationResults?.isResidential ?? response.isResidential ?? address.isResidential;

            const correctedShippoAddress: ShippoAddressInput | null = response ? {
                name: response.name || address.name,
                company: response.company || address.company,
                street1: response.street1 || address.street1,
                street2: response.street2 || address.street2,
                city: response.city || address.city,
                state: response.state || address.state,
                zip: response.zip || address.zip,
                country: response.country || address.country,
                phone: response.phone || address.phone,
                email: response.email || address.email,
                isResidential: outputIsResidential,
            } : null;

            // Shippo's top-level `isValid` on Address object might be the overall status
            // or rely on `validationResults.isValid`
            const isValidOverall = sdkValidationResults?.isValid ?? response.isValid ?? false;

            return {
                isValid: isValidOverall,
                correctedAddress: correctedShippoAddress,
                messages: validationMessages.length > 0 ? validationMessages : (isValidOverall ? [] : ['Address is invalid.']),
                isResidential: outputIsResidential,
            };
        } catch (error: any) {
            console.error("Shippo API call error during address validation:", error);
            const errorMessage = error.detail || (error.messages && error.messages[0]?.text) || error.message || 'Unknown Shippo API error';
            throw new Error(`Shippo API error during address validation: ${errorMessage}`);
        }
    },

    getRates: async (shipmentData: ShippoShipmentRequestData): Promise<AppShippoRate[]> => {
        if (!shippoInstance) {
            throw new Error("Shippo client is not initialized. API key may be missing.");
        }
        try {
            // Create shipment using SDK format
            const shipmentToCreate = {
                addressFrom: shipmentData.addressFrom,
                addressTo: shipmentData.addressTo,
                parcels: shipmentData.parcels,
                shipmentDate: shipmentData.shipmentDate,
                carrierAccounts: shipmentData.carrierAccounts,
                async: shipmentData.async === undefined ? false : shipmentData.async,
                metadata: shipmentData.metadata,
            };

            const shipment = await shippoInstance.shipments.create(shipmentToCreate as any);

            if (shipment.rates && shipment.rates.length > 0) {
                // Filter out rates with errors and map valid ones
                const validRates = shipment.rates.filter((rate: Rate) => {
                    // Filter out rates that have error messages or are from unsupported carriers
                    if (rate.messages && rate.messages.length > 0) {
                        const hasErrors = rate.messages.some(msg =>
                            msg.text?.toLowerCase().includes('error') ||
                            msg.text?.toLowerCase().includes('failed') ||
                            msg.text?.toLowerCase().includes('authentication') ||
                            msg.text?.toLowerCase().includes('doesn\'t support')
                        );
                        if (hasErrors) {
                            console.log(`Filtering out rate from ${rate.provider} due to errors:`, rate.messages.map(m => m.text).join(', '));
                            return false;
                        }
                    }
                    // Only include rates with valid amounts
                    return rate.amount && parseFloat(rate.amount) >= 0;
                });

                if (validRates.length > 0) {
                    return validRates.map((rate: Rate) => ({
                        objectId: rate.objectId,
                        amount: rate.amount,
                        currency: rate.currency,
                        provider: rate.provider,
                        providerImage75: rate.providerImage75,
                        providerImage200: rate.providerImage200,
                        servicelevel: {
                            token: rate.servicelevel?.token,
                            name: rate.servicelevel?.name,
                            terms: rate.servicelevel?.terms,
                        },
                        estimatedDays: rate.estimatedDays,
                        durationTerms: rate.durationTerms,
                        messages: rate.messages?.map(m => ({ text: m.text, code: m.code, source: m.source, type: m.type })),
                        shipment: rate.shipment,
                        attributes: rate.attributes,
                        amountLocal: rate.amountLocal,
                        currencyLocal: rate.currencyLocal,
                        arrivesBy: rate.arrivesBy,
                        carrierAccount: rate.carrierAccount,
                        test: rate.test,
                        zone: rate.zone,
                    }));
                }
            }

            // If we get here, either no rates or all rates were filtered out
            if (shipment.messages && shipment.messages.length > 0) {
                // Check if all messages are just carrier account warnings (not fatal errors)
                const fatalErrors = shipment.messages.filter((m: any) =>
                    !m.text?.includes("doesn't support") &&
                    !m.text?.includes("out of service area") &&
                    !m.text?.includes("Too Many Requests") // Rate limiting is often temporary
                );

                if (fatalErrors.length > 0) {
                    const errorMessages = fatalErrors.map((m: any) => m.text || m.code).join(', ');
                    console.error("Shippo fatal errors:", errorMessages);
                    throw new Error(`Shipping service error: ${errorMessages}`);
                } else {
                    // Only carrier compatibility warnings - log but don't throw
                    const warningMessages = shipment.messages.map((m: any) => m.text || m.code).join(', ');
                    console.warn("Shippo carrier warnings:", warningMessages);
                    return []; // Return empty array instead of throwing
                }
            }

            return [];
        } catch (error: any) {
            console.error("Shippo getRates error in service:", error);

            // Handle rate limiting specifically
            if (error.message?.includes('Too Many Requests') || error.status === 429) {
                throw new Error('Shipping service is temporarily busy. Please try again in a moment.');
            }

            // Handle authentication errors
            if (error.message?.includes('Authentication Failed') || error.status === 401) {
                throw new Error('Shipping service configuration error. Please contact support.');
            }

            const errorMessage = error.detail || (error.messages && error.messages[0]?.text) || error.message || 'Unknown Shippo API error';
            if (error instanceof Error && error.message.includes('Shippo API error')) {
                throw error;
            }
            throw new Error(`Shipping service error: ${errorMessage}`);
        }
    },

    createShipmentLabel: async (transactionRequest: ShippoTransactionRequest): Promise<AppShippoTransaction> => {
        if (!shippoInstance) {
            throw new Error("Shippo client is not initialized. API key may be missing.");
        }
        try {
            const transactionToCreate = {
                rate: transactionRequest.rate,
                labelFileType: transactionRequest.labelFileType,
                async: transactionRequest.async === undefined ? false : transactionRequest.async,
                metadata: transactionRequest.metadata,
            };
            const transaction: Transaction = await shippoInstance.transactions.create(transactionToCreate as any);

            // Map SDK's Transaction to AppShippoTransaction
            return {
                objectId: transaction.objectId,
                status: transaction.status as AppShippoTransaction['status'],
                rate: typeof transaction.rate === 'string' ? transaction.rate : (transaction.rate as Rate).objectId,
                trackingNumber: transaction.trackingNumber,
                trackingStatus: transaction.trackingStatus as AppShippoTransaction['trackingStatus'],
                trackingUrlProvider: transaction.trackingUrlProvider,
                labelUrl: transaction.labelUrl,
                commercialInvoiceUrl: transaction.commercialInvoiceUrl,
                messages: transaction.messages?.map(m => ({ text: m.text, code: m.code, source: m.source, type: m.type })),
                objectState: transaction.objectState as AppShippoTransaction['objectState'],
                eta: transaction.eta,
                parcel: typeof transaction.parcel === 'string' ? transaction.parcel : undefined,
                order: transaction.order,
                metadata: transaction.metadata,
                test: transaction.test,
            };
        } catch (error: any) {
            console.error("Shippo createShipmentLabel error in service:", error);
            const errorMessage = error.detail || (error.messages && error.messages[0]?.text) || error.message || 'Unknown Shippo API error';
            if (error instanceof Error && error.message.includes('Shippo API error')) {
                throw error;
            }
            throw new Error(`Shippo API error during createShipmentLabel: ${errorMessage}`);
        }
    },
};

export default ShippoService;
