import { useTema } from "../../hooks/useTema";
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icono from '../Icono';
import { DISENO as D } from '../../theme/diseno';
import type { PulsoBoxy } from './AvatarBoxy';
export default function EncabezadoBoxy({onVolver}:{compacto:boolean;pulso:PulsoBoxy;onVolver:()=>void}){
  const tema = useTema();
 return <View style={tema.estilo(s.row)}><Pressable accessibilityLabel="Volver atrás" style={tema.estilo(s.back)} onPress={onVolver}><Icono nombre="back" color={tema.color(D.fondo)} size={20}/></Pressable><Text style={tema.estilo(s.title)}>Boxy <Text style={tema.estilo({color:D.amarillo})}>IA</Text></Text></View>;
}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:15,paddingVertical:8,marginBottom:20},back:{backgroundColor:'#FFF',width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},title:{fontFamily:D.cuerpo,color:'#FFF',fontSize:22}});
