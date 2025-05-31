interface UPSAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface UPSShipmentRequest {
  from: UPSAddress
  to: UPSAddress
  packages: Array<{
    weight: number
    length: number
    width: number
    height: number
  }>
  serviceType?: string
}

interface UPSRateResponse {
  serviceType: string
  cost: number
  estimatedDelivery: string
}

interface UPSShipmentResponse {
  trackingNumber: string
  shipmentId: string
  labelUrl: string
  cost: number
  estimatedDelivery: string
}

class UPSService {
  private accessToken: string | null = null
  private readonly baseUrl = 'https://wwwcie.ups.com/api' // Test environment
  // Production: https://onlinetools.ups.com/api

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken

    try {
      const response = await fetch(`${this.baseUrl}/security/v1/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      })

      if (!response.ok) {
        throw new Error(`UPS Auth failed: ${response.statusText}`)
      }

      const data = await response.json()
      this.accessToken = data.access_token
      
      // Token expires in 1 hour, refresh before that
      setTimeout(() => {
        this.accessToken = null
      }, 3500000) // 58 minutes

      return this.accessToken
    } catch (error) {
      console.error('UPS Authentication error:', error)
      throw error
    }
  }

  async getRates(shipment: UPSShipmentRequest): Promise<UPSRateResponse[]> {
    try {
      const token = await this.getAccessToken()

      const requestBody = {
        RateRequest: {
          Request: {
            RequestOption: "Shop", // Get all available services
            TransactionReference: {
              CustomerContext: "Rating"
            }
          },
          Shipment: {
            Shipper: {
              Name: process.env.UPS_SHIPPER_NAME || "Jewelry Store",
              ShipperNumber: process.env.UPS_ACCOUNT_NUMBER,
              Address: {
                AddressLine: [shipment.from.line1, shipment.from.line2].filter(Boolean),
                City: shipment.from.city,
                StateProvinceCode: shipment.from.state,
                PostalCode: shipment.from.postalCode,
                CountryCode: shipment.from.country
              }
            },
            ShipTo: {
              Name: shipment.to.name,
              Address: {
                AddressLine: [shipment.to.line1, shipment.to.line2].filter(Boolean),
                City: shipment.to.city,
                StateProvinceCode: shipment.to.state,
                PostalCode: shipment.to.postalCode,
                CountryCode: shipment.to.country
              }
            },
            ShipFrom: {
              Name: process.env.UPS_SHIPPER_NAME || "Jewelry Store",
              Address: {
                AddressLine: [shipment.from.line1, shipment.from.line2].filter(Boolean),
                City: shipment.from.city,
                StateProvinceCode: shipment.from.state,
                PostalCode: shipment.from.postalCode,
                CountryCode: shipment.from.country
              }
            },
            Package: shipment.packages.map(pkg => ({
              PackagingType: {
                Code: "02", // Customer Supplied Package
                Description: "Package"
              },
              Dimensions: {
                UnitOfMeasurement: {
                  Code: "IN"
                },
                Length: pkg.length.toString(),
                Width: pkg.width.toString(),
                Height: pkg.height.toString()
              },
              PackageWeight: {
                UnitOfMeasurement: {
                  Code: "LBS"
                },
                Weight: pkg.weight.toString()
              }
            }))
          }
        }
      }

      const response = await fetch(`${this.baseUrl}/rating/v1/Rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'transId': `rate-${Date.now()}`,
          'transactionSrc': 'ecommerce'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`UPS Rate request failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      return data.RateResponse.RatedShipment.map((shipment: any) => ({
        serviceType: shipment.Service.Code,
        cost: parseFloat(shipment.TotalCharges.MonetaryValue),
        estimatedDelivery: shipment.GuaranteedDelivery?.BusinessDaysInTransit || "3-5 business days"
      }))

    } catch (error) {
      console.error('UPS Rate error:', error)
      throw error
    }
  }

  async createShipment(shipment: UPSShipmentRequest, serviceType: string = "03"): Promise<UPSShipmentResponse> {
    try {
      const token = await this.getAccessToken()

      const requestBody = {
        ShipmentRequest: {
          Request: {
            RequestOption: "nonvalidate",
            TransactionReference: {
              CustomerContext: "Shipment"
            }
          },
          Shipment: {
            Description: "Jewelry Order",
            Shipper: {
              Name: process.env.UPS_SHIPPER_NAME || "Jewelry Store",
              ShipperNumber: process.env.UPS_ACCOUNT_NUMBER,
              Address: {
                AddressLine: [shipment.from.line1, shipment.from.line2].filter(Boolean),
                City: shipment.from.city,
                StateProvinceCode: shipment.from.state,
                PostalCode: shipment.from.postalCode,
                CountryCode: shipment.from.country
              }
            },
            ShipTo: {
              Name: shipment.to.name,
              Address: {
                AddressLine: [shipment.to.line1, shipment.to.line2].filter(Boolean),
                City: shipment.to.city,
                StateProvinceCode: shipment.to.state,
                PostalCode: shipment.to.postalCode,
                CountryCode: shipment.to.country
              }
            },
            ShipFrom: {
              Name: process.env.UPS_SHIPPER_NAME || "Jewelry Store",
              Address: {
                AddressLine: [shipment.from.line1, shipment.from.line2].filter(Boolean),
                City: shipment.from.city,
                StateProvinceCode: shipment.from.state,
                PostalCode: shipment.from.postalCode,
                CountryCode: shipment.from.country
              }
            },
            Service: {
              Code: serviceType, // 03 = Ground, 02 = 2nd Day Air, 01 = Next Day Air
              Description: "UPS Ground"
            },
            Package: shipment.packages.map(pkg => ({
              Description: "Jewelry Package",
              PackagingType: {
                Code: "02"
              },
              Dimensions: {
                UnitOfMeasurement: {
                  Code: "IN"
                },
                Length: pkg.length.toString(),
                Width: pkg.width.toString(),
                Height: pkg.height.toString()
              },
              PackageWeight: {
                UnitOfMeasurement: {
                  Code: "LBS"
                },
                Weight: pkg.weight.toString()
              }
            }))
          },
          LabelSpecification: {
            LabelImageFormat: {
              Code: "PDF"
            },
            HTTPUserAgent: "Mozilla/4.5"
          }
        }
      }

      const response = await fetch(`${this.baseUrl}/shipments/v1/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'transId': `ship-${Date.now()}`,
          'transactionSrc': 'ecommerce'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`UPS Shipment creation failed: ${response.statusText}`)
      }

      const data = await response.json()
      const shipmentResult = data.ShipmentResponse.ShipmentResults

      return {
        trackingNumber: shipmentResult.PackageResults[0].TrackingNumber,
        shipmentId: shipmentResult.ShipmentIdentificationNumber,
        labelUrl: shipmentResult.PackageResults[0].ShippingLabel.GraphicImage,
        cost: parseFloat(shipmentResult.ShipmentCharges.TotalCharges.MonetaryValue),
        estimatedDelivery: shipmentResult.EstimatedDeliveryDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      }

    } catch (error) {
      console.error('UPS Shipment creation error:', error)
      throw error
    }
  }

  async trackShipment(trackingNumber: string): Promise<any> {
    try {
      const token = await this.getAccessToken()

      const response = await fetch(`${this.baseUrl}/track/v1/details/${trackingNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'transId': `track-${Date.now()}`,
          'transactionSrc': 'ecommerce'
        }
      })

      if (!response.ok) {
        throw new Error(`UPS Tracking failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('UPS Tracking error:', error)
      throw error
    }
  }
}

export default new UPSService()
