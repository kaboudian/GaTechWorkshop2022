import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint

def trace(u,t,a,m):
	w,n = u
	dw = a - w - w*n*n
	dn = w*n*n - m*n
	return dw,dn
	
t = np.arange(0,10,0.005)
a = 2
m = 0.45
u0 = [0.2,2.]
track = odeint(trace,u0,t,args = (a,m))
j = track[:,0]
k = track[:,1]

plt.plot(t,j)
plt.plot(t,k)
plt.show()