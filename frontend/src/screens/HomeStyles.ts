import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({

container:{
flex:1,

backgroundColor:'#0B1220',

paddingHorizontal:18,

paddingTop:12
},


topActions:{
flexDirection:'row',

justifyContent:'flex-end',

gap:10,

marginBottom:12
},

topActionBtn:{
backgroundColor:'#162033',

borderWidth:1,

borderColor:'#243044',

borderRadius:999,

paddingVertical:8,

paddingHorizontal:15
},

topActionBtnPrimary:{
backgroundColor:'#FFD83D',

borderRadius:999,

paddingVertical:8,

paddingHorizontal:15
},

topActionText:{
color:'#FFFFFF',

fontWeight:'800',

fontSize:12
},

topActionTextPrimary:{
color:'#111111',

fontWeight:'900',

fontSize:12
},


header:{
backgroundColor:'#101827',

borderRadius:24,

paddingHorizontal:26,

paddingVertical:18,

flexDirection:'row',

justifyContent:'space-between',

alignItems:'center',

borderWidth:1,

borderColor:'#1F2A44',

marginBottom:14
},

headerEyebrow:{
color:'#FFD83D',

fontSize:10,

fontWeight:'900',

letterSpacing:4,

textTransform:'uppercase',

marginBottom:6
},

headerTitulo:{
color:'#FFFFFF',

fontSize:40,

fontWeight:'900',

letterSpacing:-2,

marginBottom:6
},

headerSubtitulo:{
color:'#B6C2D5',

fontSize:15,

lineHeight:22,

maxWidth:420
},

headerRight:{
alignItems:'flex-end',

gap:10
},

statusPill:{
backgroundColor:'#162033',

borderWidth:1,

borderColor:'#30415F',

borderRadius:999,

paddingHorizontal:14,

paddingVertical:8,

flexDirection:'row',

alignItems:'center'
},

statusDot:{
color:'#10B981',

fontSize:10,

marginRight:7
},

statusText:{
color:'#FFFFFF',

fontWeight:'900',

fontSize:11
},

logoutBtn:{
backgroundColor:'#FFD83D',

paddingHorizontal:18,

paddingVertical:10,

borderRadius:999
},

logoutBtnTexto:{
color:'#111111',

fontWeight:'900',

fontSize:12
},


heroCard:{
backgroundColor:'#162033',

borderRadius:22,

paddingHorizontal:22,

paddingVertical:16,

marginBottom:12
},

heroLabel:{
color:'#FFD83D',

fontSize:10,

fontWeight:'900',

letterSpacing:4,

marginBottom:10,

textTransform:'uppercase'
},

heroTitulo:{
color:'#FFFFFF',

fontSize:22,

fontWeight:'900',

marginBottom:8
},

heroTexto:{
color:'#B6C2D5',

fontSize:14,

lineHeight:20,

marginBottom:14
},

heroStats:{
flexDirection:'row',

gap:10
},

statBox:{
backgroundColor:'#101827',

paddingVertical:10,

paddingHorizontal:14,

borderRadius:14,

width:90
},

statNumber:{
color:'#FFD83D',

fontSize:18,

fontWeight:'900'
},

statLabel:{
color:'#FFFFFF',

fontSize:11,

marginTop:2
},


mainCta:{
backgroundColor:'#FFD83D',

height:48,

width:340,

alignSelf:'center',

justifyContent:'center',

alignItems:'center',

borderRadius:999,

marginBottom:18
},

mainCtaText:{
color:'#111111',

fontWeight:'900',

fontSize:15
},


sectionHeader:{
marginBottom:8
},

seccionTitulo:{
fontSize:18,

fontWeight:'900',

color:'#FFFFFF',

marginBottom:3
},

seccionSubtitulo:{
color:'#B6C2D5',

fontSize:12
},

listaContainer:{
paddingBottom:20
}

});