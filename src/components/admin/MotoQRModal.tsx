'use client'

import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Modal, Button } from '@/components/ui'
import { Printer, Download } from 'lucide-react'
import type { Moto } from '@/types'

/**
 * Conteúdo codificado no QR. O app de frota (motocas_frota) faz JSON.parse,
 * lê o `id` e busca os dados atualizados da moto no Supabase.
 */
export function buildQrPayload(moto: Moto): string {
  return JSON.stringify({
    app: 'motocas',
    tipo: 'moto',
    id: moto.id,
    placa: moto.placamoto ?? '',
    nome: moto.nomemoto ?? '',
  })
}

interface Props {
  moto: Moto | null
  onClose: () => void
}

export default function MotoQRModal({ moto, onClose }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)

  if (!moto) return null

  const payload = buildQrPayload(moto)
  const titulo = `${moto.nomemoto ?? 'Moto'}${moto.anomoto ? ' ' + moto.anomoto : ''}`
  const placa = moto.placamoto || 'Sem placa'

  function getCanvas(): HTMLCanvasElement | null {
    return wrapRef.current?.querySelector('canvas') ?? null
  }

  function handleDownload() {
    const canvas = getCanvas()
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-moto-${moto!.id}-${(moto!.placamoto || '').replace(/\W/g, '')}.png`
    a.click()
  }

  function handlePrint() {
    const canvas = getCanvas()
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const win = window.open('', '_blank', 'width=420,height=560')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>QR ${placa}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .sticker { width: 280px; border: 2px solid #000; border-radius: 16px; padding: 18px; text-align: center; }
        .sticker img { width: 220px; height: 220px; }
        .nome { font-size: 16px; font-weight: 800; margin-top: 8px; }
        .placa { font-size: 22px; font-weight: 800; letter-spacing: 2px; margin-top: 2px; }
        .marca { font-size: 11px; color: #555; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }
        @media print { body { min-height: auto; } .sticker { border-color: #000; } }
      </style></head><body>
      <div class="sticker">
        <img src="${dataUrl}" alt="QR" />
        <div class="nome">${titulo}</div>
        <div class="placa">${placa}</div>
        <div class="marca">MOTOCAS · Frota</div>
      </div>
      <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 150); };</script>
      </body></html>`)
    win.document.close()
  }

  return (
    <Modal open={!!moto} onClose={onClose} title="QR Code da Moto" maxWidth="max-w-sm">
      <div className="flex flex-col items-center">
        <div ref={wrapRef} className="bg-white p-4 rounded-2xl">
          <QRCodeCanvas
            value={payload}
            size={220}
            level="M"
            marginSize={2}
            // ID embutido para leitura mesmo offline; cor da marca no centro evitada p/ legibilidade
          />
        </div>
        <p className="mt-4 font-bold text-white text-center">{titulo}</p>
        <p className="text-sm" style={{ color: '#39FF14' }}>{placa}</p>
        <p className="text-xs text-white/40 mt-1">ID #{moto.id}</p>

        <div className="flex gap-3 mt-6 w-full">
          <Button variant="outline" onClick={handleDownload} className="flex-1">
            <Download size={16} /> Baixar PNG
          </Button>
          <Button onClick={handlePrint} className="flex-1">
            <Printer size={16} /> Imprimir
          </Button>
        </div>
        <p className="text-xs text-white/40 mt-4 text-center">
          Imprima e cole como adesivo na moto. O app de frota lê este código para registrar manutenções e multas.
        </p>
      </div>
    </Modal>
  )
}
