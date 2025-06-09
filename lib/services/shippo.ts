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
    is_residential?: boolean; // Keep for input consistency with app
    validate?: boolean; // Request validation
    company?: string; // Added from user example
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
    distanceUnit: 'cm' | 'in' | 'ft' | 'mm' | 'm' | 'yd'; // Changed to camelCase
    weight: string;
    massUnit: 'g' | 'oz' | 'lb' | 'kg'; // Changed to camelCase
    template?: string;
    metadata?: string;
}

export interface ShippoShipmentRequestData {
    addressFrom: ShippoAddressInput; // Changed from address_from
    addressTo: ShippoAddressInput;   // Changed from address_to
    parcels: ShippoParcel[] | ShippoParcel;
    shipmentDate?: string; // Changed from shipment_date (YYYY-MM-DDTHH:MM:SSZ)
    async?: boolean;
    carrierAccounts?: string[]; // Changed from carrier_accounts
    metadata?: string;
    // Add other relevant fields from Shippo API docs if needed
}

// Using Shippo SDK's Rate type directly or a mapped version
// For simplicity, we'll define our expected structure based on current usage.
export interface AppShippoRate { // Renamed to avoid conflict with imported Rate
    objectId: string;
    amount: string;
    currency: string;
    provider: string;
    providerImage75?: string;
    providerImage200?: string;
    serviceLevel: { // Changed from servicelevel
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
    labelFileType?: "PDF" | "PDF_4x6" | "PNG" | "ZPLII"; // Changed from label_file_type
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
            // Map our input to Shippo SDK's expected AddressCreateRequest params
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
                is_residential: address.is_residential, // SDK might infer or use this
                validate: address.validate === undefined ? true : address.validate, // Default to true
                metadata: address.metadata,
            };

            const response: Address = await shippoInstance.addresses.create(addressToValidate as any); // Use 'as any' if type mismatch with SDK

            const sdkValidationResults = response.validationResults;
            const validationMessages = sdkValidationResults?.messages?.map(m => m.text || '').filter(text => text) || [];

            // Determine residential status from validation results, then from response, then from input
            let outputIsResidential = sdkValidationResults?.isResidential ?? response.isResidential ?? address.is_residential;

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
                is_residential: outputIsResidential,
                // metadata: response.metadata // if you want to preserve metadata from response
            } : null;

            // Shippo's top-level `isValid` on Address object might be the overall status
            // or rely on `validationResults.isValid`
            const isValidOverall = sdkValidationResults?.isValid ?? response.isValid ?? false;

            if (isValidOverall) {
                return {
                    isValid: true,
                    correctedAddress: correctedShippoAddress,
                    messages: validationMessages,
                    isResidential: outputIsResidential,
                };
            } else {
                return {
                    isValid: false,
                    correctedAddress: correctedShippoAddress,
                    messages: validationMessages.length > 0 ? validationMessages : ['Address is invalid.'],
                    isResidential: outputIsResidential,
                };
            }
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
            // Map to SDK's ShipmentCreateRequest params (camelCase for nested objects if needed by SDK)
            const shipmentToCreate = {
                addressFrom: shipmentData.addressFrom,
                addressTo: shipmentData.addressTo,
                parcels: shipmentData.parcels, // Assuming ShippoParcel matches SDK's parcel structure
                shipmentDate: shipmentData.shipmentDate,
                carrierAccounts: shipmentData.carrierAccounts,
                async: shipmentData.async === undefined ? false : shipmentData.async,
                metadata: shipmentData.metadata,
            };

            const shipment = await shippoInstance.shipments.create(shipmentToCreate as any); // Use 'as any' if type mismatch

            if (shipment.rates && shipment.rates.length > 0) {
                // Map SDK's Rate[] to AppShippoRate[]
                return shipment.rates.map((rate: Rate) => ({
                    objectId: rate.objectId,
                    amount: rate.amount,
                    currency: rate.currency,
                    provider: rate.provider,
                    providerImage75: rate.providerImage75,
                    providerImage200: rate.providerImage200,
                    serviceLevel: { // Ensure mapping for nested serviceLevel
                        token: rate.serviceLevel?.token,
                        name: rate.serviceLevel?.name,
                        terms: rate.serviceLevel?.terms,
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
            } else if (shipment.messages && shipment.messages.length > 0) {
                const errorMessages = shipment.messages.map((m: any) => m.text || m.code).join(', ');
                console.error("Shippo getRates messages:", errorMessages);
                throw new Error(errorMessages);
            }
            return [];
        } catch (error: any) {
            console.error("Shippo getRates error in service:", error);
            const errorMessage = error.detail || (error.messages && error.messages[0]?.text) || error.message || 'Unknown Shippo API error';
            if (error instanceof Error && error.message.includes('Shippo API error')) { // Avoid double prefixing
                throw error;
            }
            throw new Error(`Shippo API error during getRates: ${errorMessage}`);
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
            const transaction: Transaction = await shippoInstance.transactions.create(transactionToCreate as any); // Use 'as any' if type mismatch

            // Map SDK's Transaction to AppShippoTransaction
            return {
                objectId: transaction.objectId,
                status: transaction.status as AppShippoTransaction['status'], // Cast status
                rate: typeof transaction.rate === 'string' ? transaction.rate : (transaction.rate as Rate).objectId, // Handle if rate is object or string
                trackingNumber: transaction.trackingNumber,
                trackingStatus: transaction.trackingStatus as AppShippoTransaction['trackingStatus'], // Cast if needed
                trackingUrlProvider: transaction.trackingUrlProvider,
                labelUrl: transaction.labelUrl,
                commercialInvoiceUrl: transaction.commercialInvoiceUrl,
                messages: transaction.messages?.map(m => ({ text: m.text, code: m.code, source: m.source, type: m.type })),
                objectState: transaction.objectState as AppShippoTransaction['objectState'], // Cast if needed
                eta: transaction.eta,
                parcel: typeof transaction.parcel === 'string' ? transaction.parcel : undefined, // Handle if parcel is object or string
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
