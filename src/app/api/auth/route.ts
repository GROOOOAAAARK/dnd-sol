import { NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { AuthInput } from '@/models/auth';

export async function POST(request: Request) {
    try {
        const body: AuthInput = await request.json();

        // Validate input
        if (!body.signature || !body.publicKey) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            );
        }

        const authService = AuthService.getInstance();
        const response = await authService.authenticate(body);

        return NextResponse.json(response);
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
};