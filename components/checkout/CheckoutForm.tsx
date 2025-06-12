'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin } from 'lucide-react';
import { CartItem } from '@/types/cart';
import Image from 'next/image';

interface UserAddress {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}

interface UserInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

interface ShippingRate {
    id: string;
    name: string;
    price: number;
    estimatedDays: string;
}

interface CheckoutFormProps {
    cartItems: CartItem[];
    userAddress: UserAddress | null;
    userInfo: UserInfo;
}

export default function CheckoutForm({ cartItems, userAddress, userInfo }: CheckoutFormProps) {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [shippingRatesLoading, setShippingRatesLoading] = useState(false);
    const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
    const [selectedShippingRate, setSelectedShippingRate] = useState<string>('');
    const [addressLoaded, setAddressLoaded] = useState(false);

    const [formData, setFormData] = useState({
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        email: userInfo.email,
        phone: userInfo.phone,
        street: userAddress?.street || '',
        city: userAddress?.city || '',
        state: userAddress?.state || '',
        zipCode: userAddress?.zipCode || '',
        country: userAddress?.country || 'US',
    });

    // Load user address on component mount
    useEffect(() => {
        const loadSavedAddress = async () => {
            if (!user || addressLoaded) return

            console.log('🔄 Loading saved address for checkout via API...')

            try {
                const response = await fetch('/api/user/get-shipping-address')

                if (!response.ok) {
                    throw new Error('Failed to fetch shipping address')
                }

                const data = await response.json()

                if (data.success && data.address) {
                    if (data.hasAddress) {
                        console.log('✅ Found saved address for checkout via API:', data.address)

                        setFormData(prev => ({
                            ...prev,
                            firstName: data.address.name?.split(' ')[0] || prev.firstName,
                            lastName: data.address.name?.split(' ').slice(1).join(' ') || prev.lastName,
                            street: data.address.line1,
                            city: data.address.city,
                            state: data.address.state,
                            zipCode: data.address.postalCode,
                            country: data.address.country,
                            phone: data.address.phone || prev.phone,
                            email: data.address.email || prev.email,
                        }))

                        // Auto-calculate shipping rates if we have a complete address
                        if (data.address.line1 && data.address.city && data.address.state && data.address.postalCode) {
                            console.log('Auto-fetching rates for saved address')
                            setTimeout(() => {
                                calculateShippingRates()
                            }, 500)
                        }
                    } else {
                        console.log('🔄 No saved address for checkout, using profile data:', data.address)
                        setFormData(prev => ({
                            ...prev,
                            firstName: data.address.name?.split(' ')[0] || prev.firstName,
                            lastName: data.address.name?.split(' ').slice(1).join(' ') || prev.lastName,
                            phone: data.address.phone || prev.phone,
                            email: data.address.email || prev.email,
                        }))
                    }
                }

                setAddressLoaded(true)
            } catch (error) {
                console.error('❌ Error loading saved address for checkout:', error)

                // Fallback to original userAddress logic
                if (userAddress && !addressLoaded) {
                    setFormData(prev => ({
                        ...prev,
                        street: userAddress.street,
                        city: userAddress.city,
                        state: userAddress.state,
                        zipCode: userAddress.zipCode,
                        country: userAddress.country,
                        firstName: userAddress.firstName || prev.firstName,
                        lastName: userAddress.lastName || prev.lastName,
                        phone: userAddress.phone || prev.phone,
                    }))
                }
                setAddressLoaded(true)
            }
        }

        loadSavedAddress()
    }, [user, addressLoaded, userAddress])

    const calculateShippingRates = async () => {
        if (!formData.street || !formData.city || !formData.state || !formData.zipCode) {
            return;
        }

        setShippingRatesLoading(true);
        try {
            const response = await fetch('/api/shipping/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: {
                        street: formData.street,
                        city: formData.city,
                        state: formData.state,
                        zipCode: formData.zipCode,
                        country: formData.country,
                    },
                    items: cartItems,
                }),
            });

            if (response.ok) {
                const rates = await response.json();
                setShippingRates(rates);
                if (rates.length > 0) {
                    setSelectedShippingRate(rates[0].id);
                }
            }
        } catch (error) {
            console.error('Error calculating shipping rates:', error);
        } finally {
            setShippingRatesLoading(false);
        }
    };

    const saveUserAddress = async () => {
        if (!user) return;

        try {
            await user.update({
                privateMetadata: {
                    ...user.privateMetadata,
                    address: {
                        street: formData.street,
                        city: formData.city,
                        state: formData.state,
                        zipCode: formData.zipCode,
                        country: formData.country,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        phone: formData.phone,
                    }
                }
            });
        } catch (error) {
            console.error('Error saving user address:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleAddressBlur = () => {
        // Calculate shipping rates when address fields lose focus
        const hasCompleteAddress = formData.street && formData.city && formData.state && formData.zipCode;
        if (hasCompleteAddress) {
            calculateShippingRates();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Save address to user metadata
            await saveUserAddress();

            // Process the order
            const response = await fetch('/api/orders/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: cartItems,
                    shippingAddress: formData,
                    shippingRateId: selectedShippingRate,
                    customerInfo: {
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        phone: formData.phone,
                    },
                }),
            });

            if (response.ok) {
                const { orderId, paymentUrl } = await response.json();
                window.location.href = paymentUrl;
            } else {
                throw new Error('Failed to create order');
            }
        } catch (error) {
            console.error('Error processing checkout:', error);
        } finally {
            setLoading(false);
        }
    };

    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const selectedRate = shippingRates.find(rate => rate.id === selectedShippingRate);
    const shippingCost = selectedRate?.price || 0;
    const total = subtotal + shippingCost;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-4">
                            <div className="relative w-16 h-16">
                                <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    className="object-cover rounded"
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium">{item.name}</h3>
                                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}

                    <Separator />

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        {selectedRate && (
                            <div className="flex justify-between">
                                <span>Shipping ({selectedRate.name})</span>
                                <span>${shippingCost.toFixed(2)}</span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Checkout Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Shipping Information
                        {userAddress && (
                            <span className="text-sm font-normal text-green-600">(Loaded from profile)</span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="street">Street Address</Label>
                            <Input
                                id="street"
                                name="street"
                                value={formData.street}
                                onChange={handleInputChange}
                                onBlur={handleAddressBlur}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    onBlur={handleAddressBlur}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    onBlur={handleAddressBlur}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="zipCode">ZIP Code</Label>
                                <Input
                                    id="zipCode"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleInputChange}
                                    onBlur={handleAddressBlur}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="country">Country</Label>
                                <Input
                                    id="country"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Shipping Options */}
                        {shippingRatesLoading && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="ml-2">Calculating shipping rates...</span>
                            </div>
                        )}

                        {shippingRates.length > 0 && (
                            <div>
                                <Label>Shipping Options</Label>
                                <div className="space-y-2 mt-2">
                                    {shippingRates.map((rate) => (
                                        <label
                                            key={rate.id}
                                            className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50"
                                        >
                                            <div className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="shippingRate"
                                                    value={rate.id}
                                                    checked={selectedShippingRate === rate.id}
                                                    onChange={(e) => setSelectedShippingRate(e.target.value)}
                                                    className="mr-3"
                                                />
                                                <div>
                                                    <div className="font-medium">{rate.name}</div>
                                                    <div className="text-sm text-gray-600">{rate.estimatedDays}</div>
                                                </div>
                                            </div>
                                            <div className="font-medium">${rate.price.toFixed(2)}</div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || !selectedShippingRate}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                `Complete Order - $${total.toFixed(2)}`
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
