'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, MapPin } from 'lucide-react';
import { toast } from 'sonner';

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

interface ProfileFormProps {
    user: any;
    userAddress: UserAddress | null;
}

export default function ProfileForm({ user, userAddress }: ProfileFormProps) {
    const { user: clerkUser } = useUser();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        firstName: userAddress?.firstName || user.firstName || '',
        lastName: userAddress?.lastName || user.lastName || '',
        phone: userAddress?.phone || user.phoneNumbers?.[0]?.phoneNumber || '',
        street: userAddress?.street || '',
        city: userAddress?.city || '',
        state: userAddress?.state || '',
        zipCode: userAddress?.zipCode || '',
        country: userAddress?.country || 'US',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!clerkUser) {
                throw new Error('User not found');
            }

            await clerkUser.update({
                privateMetadata: {
                    ...clerkUser.privateMetadata,
                    shippingAddress: {
                        name: `${formData.firstName} ${formData.lastName}`.trim(),
                        line1: formData.street,
                        line2: '',
                        city: formData.city,
                        state: formData.state,
                        postalCode: formData.zipCode,
                        country: formData.country,
                        phone: formData.phone,
                        email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
                    }
                }
            });

            toast.success('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Address Information
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
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div>
                        <Label htmlFor="street">Street Address</Label>
                        <Input
                            id="street"
                            name="street"
                            value={formData.street}
                            onChange={handleInputChange}
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

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Address
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
