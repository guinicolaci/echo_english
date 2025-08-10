'use client';

import React, { useState } from 'react';
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader, // Importe este componente
  DialogTitle, // Importe este componente
} from '@/components/ui/dialog';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>Login</Button>
      </DialogTrigger>
      <DialogContent>
        {/* Adicione o DialogHeader e o DialogTitle aqui */}
        <DialogHeader>
          <DialogTitle className="text-center">Login to your account</DialogTitle>
        </DialogHeader>
        {/* O resto do conteúdo do formulário */}
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input 
                id="password" 
                type="password" 
                placeholder="Enter your password"
                required
                
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full mt-3">
            Login
          </Button>
            <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1 p-0">
                    <FcGoogle className="w-6 h-6" />
                </Button>
                <Button variant="outline" className="flex-1 p-0">
                    <FaGithub className="w-6 h-6" />
                </Button>
            </div>
            <div className="text-center text-sm mt-2">
                Don't have an account?{' '}
                <a href="#" className="font-medium text-black hover:underline">
                Create your account
                </a>
            </div>
        </CardFooter>
      </DialogContent>
    </Dialog>
  );
}